import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Ticket, Activity, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '../components/ui/badge';

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, recent: [] as any[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!profile) return;
      
      try {
        const ticketsRef = collection(db, 'tickets');
        let q;
        
        // Admins and Management see all tickets
        // Sales see their own tickets
        // Ops folks see tickets assigned to their team
        
        if (profile.role === 'Admin' || profile.role === 'Management' || profile.role === 'Team Leader') {
          q = query(ticketsRef, orderBy('createdAt', 'desc'), limit(50));
        } else if (profile.role === 'Sales') {
          q = query(ticketsRef, where('createdBy', '==', profile.uid), orderBy('createdAt', 'desc'), limit(50));
        } else {
          q = query(ticketsRef, where('assignedTeam', '==', profile.role), orderBy('createdAt', 'desc'), limit(50));
        }

        const snapshot = await getDocs(q);
        const fetchedTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        let pending = 0;
        let completed = 0;
        
        fetchedTickets.forEach(t => {
          if (['Completed', 'Closed'].includes(t.status)) {
            completed++;
          } else {
            pending++;
          }
        });

        setStats({
          total: fetchedTickets.length,
          pending,
          completed,
          recent: fetchedTickets.slice(0, 5)
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [profile]);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Welcome back, {profile?.displayName?.split(' ')[0]}</h1>
        <p className="text-slate-500">Here's what's happening with your tickets today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Tickets</p>
              <h3 className="text-2xl font-bold">{stats.total}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending</p>
              <h3 className="text-2xl font-bold">{stats.pending}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-full">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Completed</p>
              <h3 className="text-2xl font-bold">{stats.completed}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Avg Response</p>
              <h3 className="text-2xl font-bold">2.4h</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
             <div className="flex items-center justify-between mb-1">
               <CardTitle>Active Requests</CardTitle>
               <span className="text-xs text-slate-400 font-medium">{stats.recent.length} recent</span>
             </div>
          </CardHeader>
          <CardContent>
            {stats.recent.length === 0 ? (
              <p className="text-slate-500">No recent tickets found.</p>
            ) : (
              <div className="space-y-3">
                {stats.recent.map((ticket) => (
                  <Link to={`/tickets/${ticket.id}`} key={ticket.id} className="block bg-white p-4 rounded-lg border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {ticket.id.substring(0, 8).toUpperCase()}
                      </span>
                      <Badge variant={
                        ticket.status === 'Completed' || ticket.status === 'Closed' ? 'success' :
                        ticket.status === 'New' ? 'default' : 'warning'
                      }>
                        {ticket.status}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 truncate">
                       {ticket.customerName} - {ticket.ticketType}
                    </h3>
                    <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1">📍 {ticket.origin} {ticket.destination ? `→ ${ticket.destination}` : ''}</div>
                      <div>
                        {ticket.priority === 'Critical' ? 'Critical ⚡' : ticket.priority === 'Urgent' ? 'Urgent 🔺' : 'Normal'}
                        <span className="ml-2 text-slate-400">
                          {ticket.createdAt ? format(ticket.createdAt.toDate(), 'MMM d') : ''}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-4 text-center">
              <Link to="/tickets" className="text-sm text-blue-600 hover:text-blue-700 font-medium pb-2 border-b border-transparent hover:border-blue-600 transition-colors">
                View all tickets →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(profile?.role === 'Sales' || profile?.role === 'Admin') && (
              <Link to="/tickets/new" className="flex items-center p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-4 group-hover:bg-blue-200">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-medium text-slate-900">New Request</h5>
                  <p className="text-xs text-slate-500">Create a new ticket</p>
                </div>
              </Link>
            )}
             <Link to="/tickets" className="flex items-center p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mr-4 group-hover:bg-slate-200">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-medium text-slate-900">Browse Tickets</h5>
                  <p className="text-xs text-slate-500">Search knowledge base</p>
                </div>
              </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
