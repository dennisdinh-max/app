import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, subDays, isAfter } from 'date-fns';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#475569'];

export default function Reports() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    closed: 0,
    byType: [] as any[],
    byStatus: [] as any[],
    weeklyTrend: [] as any[]
  });

  useEffect(() => {
    async function fetchData() {
      if (!profile) return;
      if (profile.role !== 'Admin' && profile.role !== 'Management' && profile.role !== 'Team Leader') {
        setLoading(false);
        return; // Unauthorized
      }

      const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const tickets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      let open = 0;
      let closed = 0;
      const typesMap: Record<string, number> = {};
      const statusMap: Record<string, number> = {};
      
      // For weekly trend (last 7 days map)
      const weeklyMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        weeklyMap[format(subDays(new Date(), i), 'MMM d')] = 0;
      }

      tickets.forEach((t: any) => {
        // Status & Open/Closed
        if (['Completed', 'Closed'].includes(t.status)) {
          closed++;
        } else {
          open++;
        }

        statusMap[t.status] = (statusMap[t.status] || 0) + 1;
        typesMap[t.ticketType] = (typesMap[t.ticketType] || 0) + 1;

        // Weekly trend
        if (t.createdAt) {
          const dateStr = format(t.createdAt.toDate(), 'MMM d');
          if (weeklyMap[dateStr] !== undefined) {
            weeklyMap[dateStr]++;
          }
        }
      });

      setStats({
        total: tickets.length,
        open,
        closed,
        byType: Object.keys(typesMap).map(k => ({ name: k, value: typesMap[k] })),
        byStatus: Object.keys(statusMap).map(k => ({ name: k, value: statusMap[k] })),
        weeklyTrend: Object.keys(weeklyMap).map(k => ({ name: k, tickets: weeklyMap[k] }))
      });

      setLoading(false);
    }
    fetchData();
  }, [profile]);

  if (loading) return <div>Loading reports...</div>;
  if (profile?.role !== 'Admin' && profile?.role !== 'Management' && profile?.role !== 'Team Leader') {
    return <div className="p-8 text-center text-neutral-500">You do not have permission to view management reports.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Management Reports</h1>
        <p className="text-slate-500">Overview of ticketing performance and volume.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Total Volume</p>
            <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats.total}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Open Tickets</p>
            <h3 className="text-3xl font-bold mt-1 text-orange-600">{stats.open}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Closed Tickets</p>
            <h3 className="text-3xl font-bold mt-1 text-green-600">{stats.closed}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Resolution Rate</p>
            <h3 className="text-3xl font-bold mt-1 text-purple-600">
              {stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0}%
            </h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <Card>
          <CardHeader>
            <CardTitle>Ticket Volume (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weeklyTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="tickets" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            {stats.total === 0 ? (
              <p className="text-neutral-500">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stats.byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
