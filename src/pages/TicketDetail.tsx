import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Select } from '../components/ui/select';
import { format } from 'date-fns';
import { Paperclip, Send, ArrowLeft, Clock, File as FileIcon, User } from 'lucide-react';

export default function TicketDetail() {
  const { ticketId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<any>(null);
  const [creatorNameFallback, setCreatorNameFallback] = useState<string>('');
  const [comments, setComments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [filesSelected, setFilesSelected] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Ticket and Fallback Name
  useEffect(() => {
    if (!ticketId || !profile) return;

    // Fetch Ticket Data
    const ticketRef = doc(db, 'tickets', ticketId);
    const unsubscribeTicket = onSnapshot(ticketRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTicket({ id: docSnap.id, ...data });
        
        // Fetch Creator Fallback Name
        if (!data.creatorName && data.createdBy) {
          getDoc(doc(db, 'users', data.createdBy)).then(userSnap => {
            if (userSnap.exists()) {
              setCreatorNameFallback(userSnap.data().displayName || 'Unknown');
            }
          });
        }
      } else {
        navigate('/tickets');
      }
    });

    // Fetch Comments
    const commentsQ = query(collection(db, `tickets/${ticketId}/comments`), orderBy('createdAt', 'asc'));
    const unsubscribeComments = onSnapshot(commentsQ, (snapshot) => {
      setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch History
    const historyQ = query(collection(db, `tickets/${ticketId}/history`), orderBy('createdAt', 'desc'));
    const unsubscribeHistory = onSnapshot(historyQ, (snapshot) => {
      setHistory(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubscribeTicket();
      unsubscribeComments();
      unsubscribeHistory();
    };
  }, [ticketId, profile, navigate]);

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket || !profile) return;
    setStatusUpdating(true);
    try {
      await updateDoc(doc(db, 'tickets', ticket.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, `tickets/${ticket.id}/history`), {
        ticketId: ticket.id,
        createdAt: serverTimestamp(),
        createdBy: profile.uid,
        action: 'status_changed',
        details: `Status changed to ${newStatus}`
      });
    } catch (e) {
      console.error(e);
      alert('Failed to update status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleOppResultChange = async (newResult: string) => {
    if (!ticket || !profile) return;
    setStatusUpdating(true);
    try {
      await updateDoc(doc(db, 'tickets', ticket.id), {
        oppResult: newResult,
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, `tickets/${ticket.id}/history`), {
        ticketId: ticket.id,
        createdAt: serverTimestamp(),
        createdBy: profile.uid,
        action: 'opp_result_changed',
        details: `Opp Result updated to ${newResult}`
      });
    } catch (e) {
      console.error(e);
      alert('Failed to update Opp Result.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handlePostComment = async () => {
    if (!ticket || !profile) return;
    if (!newComment.trim() && filesSelected.length === 0) return;
    
    setIsSubmittingComment(true);

    try {
      let attachments: any[] = [];

      // Upload files if any
      if (filesSelected.length > 0) {
        for (const file of filesSelected) {
          const storageRef = ref(storage, `tickets/${ticket.id}/${Date.now()}_${file.name}`);
          const uploadTask = await uploadBytesResumable(storageRef, file);
          const downloadURL = await getDownloadURL(uploadTask.ref);
          attachments.push({
            name: file.name,
            url: downloadURL,
            size: file.size,
            uploadedAt: new Date().toISOString()
          });
        }
      }

      await addDoc(collection(db, `tickets/${ticket.id}/comments`), {
        ticketId: ticket.id,
        createdAt: serverTimestamp(),
        createdBy: profile.uid,
        creatorName: profile.displayName,
        content: newComment,
        attachments
      });

      if (attachments.length > 0) {
        await addDoc(collection(db, `tickets/${ticket.id}/history`), {
          ticketId: ticket.id,
          createdAt: serverTimestamp(),
          createdBy: profile.uid,
          action: 'file_uploaded',
          details: `Uploaded ${attachments.length} file(s)`
        });
      }

      setNewComment('');
      setFilesSelected([]);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Update ticket updatedAt
      await updateDoc(doc(db, 'tickets', ticket.id), { updatedAt: serverTimestamp() });

    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to reply.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (!ticket) return <div className="p-8">Loading...</div>;
  
  const canChangeStatus = profile?.role !== 'Sales';
  const canChangeOppResult = profile?.uid === ticket.createdBy || profile?.role === 'Admin' || profile?.role === 'Management';

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
      
      {/* Left Column: Ticket Details & Thread */}
      <div className="flex-1 space-y-6">
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold tracking-tight">{ticket.customerName}</h1>
              <Badge variant={ticket.status === 'Completed' || ticket.status === 'Closed' ? 'success' : 'default'}>
                {ticket.status}
              </Badge>
              {ticket.priority === 'Critical' && <Badge variant="error">Critical</Badge>}
            </div>
            <p className="text-neutral-500">{ticket.ticketType} • {ticket.origin} → {ticket.destination}</p>
          </div>
        </div>

        {/* Thread */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Discussion Thread</h3>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 pb-4">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-sm">No comments yet. Start the discussion below.</div>
            ) : (
              comments.map(c => (
                <div key={c.id} className={`flex gap-4 ${c.createdBy === profile.uid ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className={`max-w-[85%] rounded-xl p-4 shadow-sm ${c.createdBy === profile.uid ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200'}`}>
                    <div className={`text-xs mb-1 font-medium tracking-wide ${c.createdBy === profile.uid ? 'text-blue-100' : 'text-slate-500'}`}>
                      {c.creatorName} • {c.createdAt ? format(c.createdAt.toDate(), 'MMM d, h:mm a') : 'Now'}
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{c.content}</p>
                    {c.attachments && c.attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {c.attachments.map((file: any, i: number) => (
                          <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" 
                             className={`flex items-center space-x-2 text-xs p-2 rounded ${c.createdBy === profile.uid ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-neutral-50 hover:bg-neutral-100 text-blue-600'} transition-colors`}>
                            <FileIcon className="w-4 h-4" />
                            <span className="truncate max-w-[200px]">{file.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
            <Textarea 
              placeholder="Reply to this ticket or add an update..."
              className="border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-100 resize-none h-24 mb-3 p-3 rounded-lg"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            
            {filesSelected.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {filesSelected.map((f, i) => (
                  <Badge key={i} variant="neutral" className="flex items-center gap-1">
                    <FileIcon className="w-3 h-3" />
                    <span className="truncate max-w-[120px]">{f.name}</span>
                    <button onClick={() => setFilesSelected(filesSelected.filter((_, idx) => idx !== i))} className="ml-1 text-neutral-500 hover:text-red-500">×</button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center border-t border-neutral-100 pt-3">
              <div>
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files) {
                      setFilesSelected([...filesSelected, ...Array.from(e.target.files)]);
                    }
                  }}
                />
                <Button variant="ghost" size="sm" className="text-neutral-500" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="w-4 h-4 mr-2" />
                  Attach Files
                </Button>
              </div>
              <Button onClick={handlePostComment} disabled={isSubmittingComment || (!newComment.trim() && filesSelected.length === 0)}>
                <Send className="w-4 h-4 mr-2" />
                {isSubmittingComment ? 'Sending...' : 'Reply'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Meta Info */}
      <div className="w-full lg:w-80 space-y-6">
        <Card>
          <CardHeader className="pb-3 border-b border-neutral-100">
            <CardTitle>Ticket Info</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-neutral-500 mb-1">Status</p>
                <Select 
                  value={ticket.status} 
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={!canChangeStatus || statusUpdating}
                  className="w-full"
                >
                  <option value="New">New</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Waiting Info">Waiting Info</option>
                  <option value="Quoted">Quoted</option>
                  <option value="Completed">Completed</option>
                  <option value="Closed">Closed</option>
                </Select>
              </div>

              <div>
                <p className="text-xs font-medium text-neutral-500 mb-1">Opp Result</p>
                <Select 
                  value={ticket.oppResult || 'Quoting'} 
                  onChange={(e) => handleOppResultChange(e.target.value)}
                  disabled={!canChangeOppResult || statusUpdating}
                  className="w-full"
                >
                  <option value="Quoting">Quoting</option>
                  <option value="Won">Won</option>
                  <option value="Failed">Failed</option>
                  <option value="Follow up">Follow up</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-neutral-500">Assigned Team</p>
                <p className="text-sm font-medium">{ticket.assignedTeam}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500">Shipment Type</p>
                <p className="text-sm font-medium">{ticket.shipmentType}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-neutral-500">Cargo & Volume</p>
              <p className="text-sm">{ticket.cargoDescription}</p>
              <p className="text-sm text-neutral-600 mt-1">{ticket.volumeWeight}</p>
            </div>

            {ticket.specialRequirements && (
              <div>
                <p className="text-xs font-medium text-neutral-500">Requirements</p>
                <p className="text-sm bg-neutral-50 p-2 rounded mt-1">{ticket.specialRequirements}</p>
              </div>
            )}
            
            <div className="pt-4 border-t border-neutral-100 text-xs text-neutral-500">
              <div className="flex items-center justify-between mb-1">
                <span>Created By:</span>
                <span className="font-medium text-slate-700">{ticket.creatorName || creatorNameFallback || "Unknown"}</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span>Created:</span>
                <span>{ticket.createdAt ? format(ticket.createdAt.toDate(), 'MMM d, h:mm a') : ''}</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span>Ticket ID:</span>
                <span>{ticket.id.substring(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Log mini */}
        <Card>
          <CardHeader className="pb-3 border-b border-neutral-100">
            <CardTitle className="text-sm flex justify-between items-center">
              <span>Activity Log</span>
              <Clock className="w-4 h-4 text-neutral-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <div className="max-h-64 overflow-y-auto px-6 pb-4">
              {history.length === 0 ? (
                <p className="text-xs text-neutral-500">No activity yet.</p>
              ) : (
                <div className="relative border-l border-neutral-200 ml-3 space-y-4">
                  {history.map(log => (
                    <div key={log.id} className="relative pl-4">
                      <div className="absolute w-2 h-2 bg-neutral-300 rounded-full -left-[4.5px] top-1.5 ring-4 ring-white"></div>
                      <p className="text-xs font-medium text-neutral-800">{log.action.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-xs text-neutral-500">{log.details}</p>
                      <p className="text-[10px] text-neutral-400 mt-1">{log.createdAt ? format(log.createdAt.toDate(), 'MMM d, h:mm a') : 'Now'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
