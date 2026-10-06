import React, { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, Clock3, Edit3, FileText, LogOut, Save, ShieldCheck, Upload, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { TsppDocument, TsppTeacherProfile, tsppAPI, uploadAPI, User } from '../../../../services/api';
import './tspp-theme.css';

const DOCUMENT_TYPES = [
  { value: 'degree', label: 'Degree Certificate' },
  { value: 'teaching_license', label: 'Teaching License' },
  { value: 'identification', label: 'ID / Passport' },
  { value: 'reference', label: 'Reference Letter' },
  { value: 'other', label: 'Other' },
];

const getStatusBadge = (status: TsppDocument['status']) => {
  if (status === 'approved') return { label: 'Approved', color: 'var(--tspp-success)', bg: 'rgba(16,185,129,0.1)' };
  if (status === 'rejected') return { label: 'Rejected', color: 'var(--tspp-warning)', bg: 'rgba(245,158,11,0.1)' };
  return { label: 'Pending review', color: 'var(--tspp-ink-muted)', bg: 'rgba(100,116,139,0.08)' };
};

const TsppClient: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TsppTeacherProfile | null>(null);
  const [documents, setDocuments] = useState<TsppDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState('degree');
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<TsppTeacherProfile>>({});

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileData, docsData] = await Promise.all([
        tsppAPI.getProfile(),
        tsppAPI.getDocuments(),
      ]);
      setProfile(profileData);
      setDocuments(docsData);
      if (profileData) {
        setEditedProfile(profileData);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        const newProfile = await tsppAPI.getProfile();
        setProfile(newProfile);
        if (newProfile) setEditedProfile(newProfile);
      } else {
        setError(err.message || 'Could not load your profile data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    try {
      await tsppAPI.saveProfile({
        subjectArea: editedProfile.subjectArea,
        gradeLevel: editedProfile.gradeLevel,
        bio: editedProfile.bio,
        website: editedProfile.website,
        yearsExperience: editedProfile.yearsExperience,
      });
      setSuccess('Profile updated successfully.');
      setEditMode(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setError('Please select a file to upload.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const urls = await uploadAPI.upload([uploadFile]);
      const fileUrl = urls[0];
      await tsppAPI.addDocument({
        documentType: uploadType,
        fileUrl,
        fileName: uploadFile.name,
        fileSize: uploadFile.size,
        mimeType: uploadFile.type,
      });
      setSuccess('Document uploaded and submitted for review.');
      setShowUpload(false);
      setUploadFile(null);
      setUploadType('degree');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await tsppAPI.deleteDocument(id);
      setSuccess('Document removed.');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Could not delete document.');
    }
  };

  const getVerificationPercentage = () => {
    if (!profile) return 0;
    let count = 0;
    if (profile.subjectArea) count += 20;
    if (profile.gradeLevel) count += 20;
    if (profile.bio) count += 20;
    if (profile.website) count += 20;
    if (profile.yearsExperience) count += 20;
    return count;
  };

  const getVerificationStatusColor = () => {
    if (!profile) return { label: 'Not started', color: 'var(--tspp-ink-muted)' };
    if (profile.verificationStatus === 'verified') return { label: 'Verified', color: 'var(--tspp-success)' };
    if (profile.verificationStatus === 'rejected') return { label: 'Rejected', color: 'var(--tspp-warning)' };
    return { label: 'Pending review', color: 'var(--tspp-warning)' };
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  };

  if (loading) {
    return (
      <div className="tspp-client" style={{ minHeight: '100vh', backgroundColor: 'var(--tspp-paper-cool)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="tspp-avatar" style={{ width: '64px', height: '64px', margin: '0 auto 1.5rem', fontSize: '1.4rem' }}>
              {user ? getInitials(user.name) : 'T'}
            </div>
            <p style={{ color: 'var(--tspp-slate)' }}>Loading your TSPP dashboard…</p>
          </div>
        </div>
      </div>
    );
  }

  const verificationStatus = getVerificationStatusColor();
  const profilePct = getVerificationPercentage();

  return (
    <div className="tspp-client" style={{ minHeight: '100vh', backgroundColor: 'var(--tspp-paper-cool)' }}>
      <header className="tspp-topbar">
        <div className="tspp-topbar-inner">
          <Link to="/tspp" className="tspp-brand">
            <span className="tspp-brand-mark">T</span>
            <div className="tspp-brand-text">
              <strong>TSPP</strong>
              <small>Teachers &amp; Private Schools</small>
            </div>
          </Link>

          <nav className="tspp-nav" aria-label="TSPP navigation">
            <a href="#profile">My profile</a>
            <a href="#documents">Documents</a>
            <a href="#verification">Verification</a>
          </nav>

          <div className="tspp-actions">
            <button type="button" className="tspp-btn tspp-btn-ghost" onClick={logout}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="tspp-section tspp-client-content">
        <div className="tspp-client-intro" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="tspp-avatar" style={{ width: '72px', height: '72px', fontSize: '1.6rem' }}>
              {user ? getInitials(user.name) : 'T'}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '2rem' }}>{user?.name || 'Teacher'}</h1>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--tspp-slate)' }}>{user?.email}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="tspp-card" style={{ marginBottom: '1.5rem', border: '1px solid #fca5a5', background: 'rgba(248,183,183,0.3)' }}>
            <p style={{ color: '#991c1c', margin: 0 }}>{error}</p>
          </div>
        )}

        {success && (
          <div className="tspp-card" style={{ marginBottom: '1.5rem', border: '1px solid #86efac', background: 'rgba(136,222,176,0.3)' }}>
            <p style={{ color: '#15803d', margin: 0 }}>{success}</p>
          </div>
        )}

        <section id="verification" className="tspp-section" style={profile ? { paddingTop: 0, paddingBottom: '1.5rem' } : { display: 'none' }}>
          <div className="tspp-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div className="tspp-section-heading" style={{ marginBottom: 0 }}>
                  <p className="tspp-kicker"><ShieldCheck size={14} /> VERIFICATION STATUS</p>
                  <h2 style={{ margin: 0, fontSize: '1.7rem' }}>{verificationStatus.label}</h2>
                </div>
              </div>
              <span className="tspp-badge" style={{ backgroundColor: verificationStatus.color === 'var(--tspp-success)' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: verificationStatus.color }}>
                {verificationStatus.label}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '140px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ flex: 1, height: '0.625rem', overflow: 'hidden', borderRadius: '999px', backgroundColor: 'var(--tspp-line)' }}>
                    <div style={{ width: `${profilePct}%`, height: '100%', borderRadius: '999px', backgroundColor: 'var(--tspp-accent)' }} />
                  </div>
                  <strong style={{ fontSize: '1.3rem', color: 'var(--tspp-primary)' }}>{profilePct}%</strong>
                </div>
                <small style={{ color: 'var(--tspp-slate)', fontSize: '0.8rem' }}>Profile strength</small>
              </div>

              <button
                type="button"
                className="tspp-btn tspp-btn-ghost tspp-btn-mini"
                onClick={() => setEditMode(true)}
                style={{ height: '38px' }}
              >
                <Edit3 size={14} /> Edit profile
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--tspp-ink-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} /> <span>{documents.length} documents uploaded</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} /> <span>{profile.subjectArea || 'Add subject area'}</span>
              </div>
            </div>
          </div>
        </section>

        <section id="profile" className="tspp-card" style={profile ? { marginTop: '1.5rem' } : { display: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div className="tspp-section-heading" style={{ marginBottom: 0 }}>
              <p className="tspp-kicker"><User size={14} /> TEACHER PROFILE</p>
              <h2 style={{ margin: 0, fontSize: '1.7rem' }}>Your profile details</h2>
            </div>
            {!editMode && (
              <button type="button" className="tspp-btn tspp-btn-mini" onClick={() => setEditMode(true)}>
                <Edit3 size={14} /> Edit
              </button>
            )}
          </div>

          {editMode ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--tspp-ink-muted)' }}>Subject area</label>
                  <input
                    type="text"
                    className="tspp-input"
                    placeholder="e.g. Biology, Chemistry, Primary Science"
                    value={editedProfile.subjectArea || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, subjectArea: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--tspp-ink-muted)' }}>Grade level</label>
                  <input
                    type="text"
                    className="tspp-input"
                    placeholder="e.g. KS3, IGCSE, A-Level"
                    value={editedProfile.gradeLevel || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, gradeLevel: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--tspp-ink-muted)' }}>Years of experience</label>
                <input
                  type="number"
                  className="tspp-input"
                  placeholder="e.g. 5"
                  min="0"
                  value={editedProfile.yearsExperience || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, yearsExperience: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600', marginBottom: '0.5rem', color: 'var(--tspp-ink-muted)' }}>Website / Portfolio</label>
                <input
                  type="url"
                  className="tspp-input"
                  placeholder="https://your-website.com"
                  value={editedProfile.website || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, website: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--tspp-ink-muted)' }}>Bio</label>
                <textarea
                  className="tspp-input"
                  placeholder="Tell schools about your teaching philosophy, specializations, and experience..."
                  rows={4}
                  value={editedProfile.bio || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="tspp-btn tspp-btn-ghost" onClick={() => { setEditMode(false); setEditedProfile(profile || {}); }}>
                  Cancel
                </button>
                <button type="button" className="tspp-btn tspp-btn-primary" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Saving...' : <><Save size={14} /> Save profile</>}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <p className="tspp-label">Subject area</p>
                <p style={{ fontSize: '1rem', color: 'var(--tspp-ink)' }}>{profile.subjectArea || <em style={{ color: 'var(--tspp-slate)' }}>Not set</em>}</p>
              </div>
              <div>
                <p className="tspp-label">Grade level</p>
                <p style={{ fontSize: '1rem', color: 'var(--tspp-ink)' }}>{profile.gradeLevel || <em style={{ color: 'var(--tspp-slate)' }}>Not set</em>}</p>
              </div>
              <div>
                <p className="tspp-label">Years of experience</p>
                <p style={{ fontSize: '1rem', color: 'var(--tspp-ink)' }}>{profile.yearsExperience !== null && profile.yearsExperience !== undefined ? profile.yearsExperience : <em style={{ color: 'var(--tspp-slate)' }}>Not set</em>}</p>
              </div>
              <div>
                <p className="tspp-label">Website</p>
                <p style={{ fontSize: '1rem', color: 'var(--tspp-ink)' }}>{profile.website ? <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tspp-accent)' }}>{profile.website}</a> : <em style={{ color: 'var(--tspp-slate)' }}>Not set</em>}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p className="tspp-label">Bio</p>
                <p style={{ fontSize: '1rem', color: 'var(--tspp-ink)', whiteSpace: 'pre-wrap' }}>{profile.bio || <em style={{ color: 'var(--tspp-slate)' }}>Not set</em>}</p>
              </div>
            </div>
          )}
        </section>

        <section id="documents" className="tspp-card" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div className="tspp-section-heading" style={{ marginBottom: 0 }}>
              <p className="tspp-kicker"><FileText size={14} /> VERIFICATION DOCUMENTS</p>
              <h2 style={{ margin: 0, fontSize: '1.7rem' }}>Uploaded documents</h2>
              <p style={{ marginTop: '0.5rem', color: 'var(--tspp-slate)' }}>Upload credentials and certificates for verification. Once reviewed, they'll appear in school search results.</p>
            </div>
            <button type="button" className="tspp-btn tspp-btn-primary tspp-btn-mini" onClick={() => setShowUpload(true)} style={{ height: '38px' }}>
              <Upload size={14} /> Upload
            </button>
          </div>

          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div className="tspp-icon-wrap" style={{ width: '56px', height: '56px', margin: '0 auto 1.25rem' }}>
                <FileText size={24} />
              </div>
              <p style={{ color: 'var(--tspp-slate)', marginBottom: '1rem' }}>No documents uploaded yet.</p>
              <button type="button" className="tspp-btn tspp-btn-primary tspp-btn-mini" onClick={() => setShowUpload(true)}>
                <Upload size={14} /> Upload your first document
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {documents.map((doc) => {
                const badge = getStatusBadge(doc.status);
                return (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: 'var(--tspp-radius-sm)', border: '1px solid var(--tspp-line)', background: 'var(--tspp-paper)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <div className="tspp-icon-wrap" style={{ width: '44px', height: '44px', background: 'rgba(10,38,51,0.04)' }}>
                        <FileText size={20} style={{ color: 'var(--tspp-primary)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--tspp-slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{DOCUMENT_TYPES.find((d) => d.value === doc.documentType)?.label || doc.documentType}</p>
                        <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tspp-primary)', margin: '0.2rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.fileName}</p>
                        {doc.fileSize && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--tspp-slate-light)', marginTop: '0.25rem' }}>{Math.round(doc.fileSize / 1024)} KB</p>
                        )}
                        {doc.rejectionReason && doc.status === 'rejected' && (
                          <p style={{ fontSize: '0.78rem', color: 'var(--tspp-warning)', marginTop: '0.3rem' }}>Rejection reason: {doc.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                    <span className="tspp-pill" style={{ backgroundColor: badge.bg, color: badge.color, marginLeft: '1rem' }}>
                      {badge.label}
                    </span>
                    <button
                      type="button"
                      className="tspp-btn tspp-btn-mini tspp-btn-ghost"
                      style={{ marginLeft: '0.75rem', height: '34px' }}
                      onClick={() => handleDeleteDocument(doc.id)}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {!profile && (
          <section className="tspp-section" style={{ paddingTop: 0, paddingBottom: '1.5rem' }}>
            <div className="tspp-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <div className="tspp-icon-wrap" style={{ width: '64px', height: '64px', margin: '0 auto 1.5rem' }}>
                <User size={28} />
              </div>
              <h2 style={{ margin: '0 0 0.75rem' }}>Complete your teacher profile</h2>
              <p style={{ color: 'var(--tspp-slate)', marginBottom: '1.5rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                Add your subject area, grade level, bio, and years of experience to appear in verified school searches on TSPP.
              </p>
              <button type="button" className="tspp-btn tspp-btn-primary" onClick={() => setEditMode(true)}>
                <Edit3 size={16} /> Create your profile
              </button>
            </div>
          </section>
        )}
      </main>

      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="tspp-card" style={{ maxWidth: '520px', width: '90%', margin: '1rem' }}>
            <h3 style={{ margin: '0 0 1rem' }}><Upload size={20} style={{ marginRight: '0.5rem' }} /> Upload document</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--tspp-ink-muted)' }}>Document type</label>
              <select className="tspp-input" value={uploadType} onChange={(e) => setUploadType(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--tspp-radius-sm)', border: '1px solid var(--tspp-line)' }}>
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>{dt.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--tspp-ink-muted)' }}>File</label>
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="tspp-input"
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="tspp-btn tspp-btn-ghost" onClick={() => { setShowUpload(false); setUploadFile(null); }}>
                Cancel
              </button>
              <button type="button" className="tspp-btn tspp-btn-primary" onClick={handleUpload} disabled={uploading || !uploadFile}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TsppClient;
