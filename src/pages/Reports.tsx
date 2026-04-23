import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, subDays, subMonths, isAfter, startOfDay, startOfMonth } from 'date-fns';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#475569'];

export default function Reports() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    closed: 0,
    byType: [] as any[],
    byStatus: [] as any[],
    byOppResult: [] as any[],
    trend: [] as any[]
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

      const now = new Date();
      let startDate = new Date(0);
      
      const trendMap: Record<string, number> = {};
      
      if (timeRange === 'week') {
        startDate = startOfDay(subDays(now, 6));
        for (let i = 6; i >= 0; i--) {
          trendMap[format(subDays(now, i), 'MMM d')] = 0;
        }
      } else if (timeRange === 'month') {
        startDate = startOfDay(subDays(now, 29));
        for (let i = 29; i >= 0; i--) {
          trendMap[format(subDays(now, i), 'MMM d')] = 0;
        }
      } else if (timeRange === 'year') {
        startDate = startOfMonth(subMonths(now, 11));
        for (let i = 11; i >= 0; i--) {
          trendMap[format(subMonths(now, i), 'MMM yyyy')] = 0;
        }
      }

      let open = 0;
      let closed = 0;
      const typesMap: Record<string, number> = {};
      const statusMap: Record<string, number> = {};
      const oppResultMap: Record<string, number> = {};
      let filteredTotal = 0;

      tickets.forEach((t: any) => {
        if (!t.createdAt) return;
        const d = t.createdAt.toDate();
        
        // Filter by the selected timeframe
        if (isAfter(d, startDate) || format(d, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd')) {
          filteredTotal++;
          
          if (['Completed', 'Closed'].includes(t.status)) {
            closed++;
          } else {
            open++;
          }

          statusMap[t.status] = (statusMap[t.status] || 0) + 1;
          typesMap[t.ticketType] = (typesMap[t.ticketType] || 0) + 1;
          
          const oppKey = t.oppResult || 'Quoting';
          oppResultMap[oppKey] = (oppResultMap[oppKey] || 0) + 1;

          // Bucket for trend chart
          let key = '';
          if (timeRange === 'week' || timeRange === 'month') {
            key = format(d, 'MMM d');
          } else if (timeRange === 'year') {
            key = format(d, 'MMM yyyy');
          }
          
          if (trendMap[key] !== undefined) {
            trendMap[key]++;
          }
        }
      });

      setStats({
        total: filteredTotal,
        open,
        closed,
        byType: Object.keys(typesMap).map(k => ({ name: k, value: typesMap[k] })),
        byStatus: Object.keys(statusMap).map(k => ({ name: k, value: statusMap[k] })),
        byOppResult: Object.keys(oppResultMap).map(k => ({ name: k, value: oppResultMap[k] })),
        trend: Object.keys(trendMap).map(k => ({ name: k, tickets: trendMap[k] }))
      });

      setLoading(false);
    }
    fetchData();
  }, [profile, timeRange]);

  if (loading) return <div>Loading reports...</div>;
  if (profile?.role !== 'Admin' && profile?.role !== 'Management' && profile?.role !== 'Team Leader') {
    return <div className="p-8 text-center text-neutral-500">You do not have permission to view management reports.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Management Reports</h1>
          <p className="text-slate-500">Overview of ticketing performance and volume.</p>
        </div>
        <div className="w-full sm:w-48">
          <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="bg-white shadow-sm font-medium">
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last 12 Months</option>
          </Select>
        </div>
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
            <CardTitle>Ticket Volume ({timeRange === 'week' ? 'Last 7 Days' : timeRange === 'month' ? 'Last 30 Days' : 'Last 12 Months'})</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.trend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280', fontSize: 12 }} 
                  interval={timeRange === 'month' ? 4 : 0} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="tickets" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={timeRange === 'month' ? 8 : 40} />
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
              <p className="text-neutral-500">No data for this time period</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Opportunity Results</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            {stats.total === 0 ? (
              <p className="text-neutral-500">No data for this time period</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byOppResult}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stats.byOppResult.map((entry, index) => {
                      const color = entry.name === 'Won' ? '#16a34a' :
                                    entry.name === 'Failed' ? '#dc2626' :
                                    entry.name === 'Follow up' ? '#d97706' : '#94a3b8';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets by Type</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            {stats.total === 0 ? (
              <p className="text-neutral-500">No data for this time period</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stats.byType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
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
