import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';

export default function CreateTicket() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    ticketType: 'Inland Trucking Quotation',
    customerName: '',
    shipmentType: 'FCL',
    cargoDescription: '',
    volumeWeight: '',
    origin: '',
    destination: '',
    specialRequirements: '',
    deadline: '',
    priority: 'Normal',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);

    try {
      let assignedTeam = 'Trucking / Pricing';
      if (formData.ticketType === 'Customs Clearance Consultation') {
        assignedTeam = 'Customs Inland Service';
      } else if (formData.ticketType === 'LMS Overseas Request') {
        assignedTeam = 'LMS Overseas Service';
      }

      const deadlineDate = formData.deadline ? new Date(formData.deadline) : null;

      const newTicket = {
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: profile.uid,
        creatorName: profile.displayName,
        department: profile.department,
        status: 'New',
        oppResult: 'Quoting', // Automatically start with Quoting
        assignedTeam,
        assignedTo: null,
        deadline: deadlineDate ? deadlineDate : null,
      };

      const docRef = await addDoc(collection(db, 'tickets'), newTicket);
      
      // Auto-create history log
      await addDoc(collection(db, `tickets/${docRef.id}/history`), {
        ticketId: docRef.id,
        createdAt: serverTimestamp(),
        createdBy: profile.uid,
        action: 'created',
        details: 'Ticket created by Sales'
      });

      navigate(`/tickets/${docRef.id}`);
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert("Failed to create ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Create New Request</h1>
        <p className="text-slate-500">Submit a new request to Customs or Trucking teams.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Ticket Type *</label>
                <Select name="ticketType" value={formData.ticketType} onChange={handleChange} required>
                  <option value="Inland Trucking Quotation">Inland Trucking Quotation</option>
                  <option value="Customs Clearance Consultation">Customs Clearance Consultation</option>
                  <option value="LMS Overseas Request">LMS Overseas Request</option>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Customer Name *</label>
                <Input name="customerName" value={formData.customerName} onChange={handleChange} required placeholder="e.g. ABC Manufacturing Corp" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Shipment Type *</label>
                <Select name="shipmentType" value={formData.shipmentType} onChange={handleChange} required>
                  <option value="FCL">FCL - Full Container Load</option>
                  <option value="LCL">LCL - Less than Container Load</option>
                  <option value="Air">Air Freight</option>
                  <option value="Inland">Domestic Inland</option>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Priority</label>
                <Select name="priority" value={formData.priority} onChange={handleChange}>
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Critical">Critical</option>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-neutral-700">Cargo Description *</label>
                <Input name="cargoDescription" value={formData.cargoDescription} onChange={handleChange} required placeholder="e.g. 20 pallets of electronics" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Volume / Weight *</label>
                <Input name="volumeWeight" value={formData.volumeWeight} onChange={handleChange} required placeholder="e.g. 15 CBM / 5000 KGS" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Deadline</label>
                <Input name="deadline" type="datetime-local" value={formData.deadline} onChange={handleChange} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Origin (POL / Pickup) *</label>
                <Input name="origin" value={formData.origin} onChange={handleChange} required placeholder="e.g. VSIP Binh Duong" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Destination (POD / Delivery) *</label>
                <Input name="destination" value={formData.destination} onChange={handleChange} required placeholder="e.g. Cat Lai Port, HCMC" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-neutral-700">Service Requirements & Additional Info</label>
                <Textarea 
                  name="specialRequirements" 
                  value={formData.specialRequirements} 
                  onChange={handleChange} 
                  placeholder="Provide specific details, HS codes, or special truck requirements here..."
                  className="h-32"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-neutral-100">
              <Button type="button" variant="outline" className="mr-3" onClick={() => navigate('/tickets')}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
