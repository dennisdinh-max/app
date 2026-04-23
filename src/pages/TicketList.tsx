import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, Filter } from 'lucide-react';

export default function TicketList() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      const map: Record<string, string> = {};
      snap.forEach(d => { map[d.id] = d.data().displayName || 'Unknown'; });
      setUserMap(map);
    });
  }, []);

  useEffect(() => {
    if (!profile) return;

    const ticketsRef = collection(db, 'tickets');
    let q;

    if (profile.role === 'Admin' || profile.role === 'Management' || profile.role === 'Team Leader') {
      q = query(ticketsRef, orderBy('createdAt', 'desc'));
    } else if (profile.role === 'Sales') {
      q = query(ticketsRef, where('createdBy', '==', profile.uid), orderBy('createdAt', 'desc'));
    } else {
      q = query(ticketsRef, where('assignedTeam', '==', profile.role), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTickets(fetchedTickets);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tickets:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const filteredTickets = tickets.filter(ticket => {
    const creator = ticket.creatorName || userMap[ticket.createdBy] || 'Unknown';
    const matchesSearch = ticket.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ticket.ticketType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          creator.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Tickets</h1>
        <p className="text-slate-500">Manage your inland and customs service requests.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input 
            className="pl-10 border-transparent bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 shadow-sm" 
            placeholder="Search by customer, ticket type, or creator..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48 relative">
           <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
           <Select 
             value={statusFilter} 
             onChange={(e) => setStatusFilter(e.target.value)}
             className="pl-9 bg-white shadow-sm border-transparent focus:ring-2 focus:ring-blue-500"
           >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting Info">Waiting Info</option>
            <option value="Quoted">Quoted</option>
            <option value="Completed">Completed</option>
            <option value="Closed">Closed</option>
          </Select>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-neutral-50 text-neutral-600 font-medium border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Type & Route</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created By</th>
                <th className="px-6 py-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">Loading tickets...</td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">No tickets found.</td>
                </tr>
              ) : (
                filteredTickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link to={`/tickets/${ticket.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                        {ticket.customerName}
                      </Link>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{ticket.department}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium">{ticket.ticketType}</div>
                      <div className="text-xs text-slate-500 mt-1">{ticket.origin} → {ticket.destination}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={
                        ticket.priority === 'Critical' ? 'text-red-600 font-medium' :
                        ticket.priority === 'Urgent' ? 'text-yellow-600 font-medium' : 'text-neutral-600'
                      }>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex flex-col gap-2 items-start">
                      <Badge variant={
                        ['Completed', 'Closed'].includes(ticket.status) ? 'success' :
                        ticket.status === 'New' ? 'default' : 'warning'
                      }>
                        {ticket.status}
                      </Badge>
                      <Badge variant={
                        ticket.oppResult === 'Won' ? 'success' :
                        ticket.oppResult === 'Failed' ? 'error' :
                        ticket.oppResult === 'Follow up' ? 'warning' : 'neutral'
                      } className="text-[10px]">
                        Op: {ticket.oppResult || 'Quoting'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700 font-medium">{ticket.creatorName || userMap[ticket.createdBy] || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {ticket.createdAt ? format(ticket.createdAt.toDate(), 'MMM d, yyyy') : '...'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
