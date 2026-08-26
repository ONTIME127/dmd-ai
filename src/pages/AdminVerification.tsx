import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileCheck2,
  FileWarning,
  History,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../styles/portal.css";

type VerificationDocument = {
  id: string;
  application_id: string;
  original_filename: string;
  document_type: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  review_status: string;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type VerificationApplication = {
  id: string;
  organization_id: string;
  submitted_by: string;
  representative_name: string;
  representative_role: string;
  department: string | null;
  professional_license_number: string | null;
  work_email: string;
  status: string;
  reviewer_notes: string | null;
  submitted_at: string;
  review_started_at: string | null;
  reviewed_at: string | null;
};

type Organization = {
  id: string;
  name: string;
  facility_type: string;
  registration_number: string;
  country: string;
  state_province: string | null;
  city: string;
  address: string;
  website: string | null;
  phone: string;
  verification_status: string;
};

type AuditEntry = {
  id: string;
  application_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  notes: string | null;
  created_at: string;
};

type DecisionDialog = {
  kind: "application" | "document";
  targetId: string;
  decision: string;
  title: string;
  description: string;
  requireNotes: boolean;
} | null;

const pretty = (value?: string | null) =>
  value ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not provided";

const dateText = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "—";

export default function AdminVerification() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<VerificationApplication[]>([]);
  const [organizations, setOrganizations] = useState<Record<string, Organization>>({});
  const [documents, setDocuments] = useState<Record<string, VerificationDocument[]>>({});
  const [audit, setAudit] = useState<Record<string, AuditEntry[]>>({});
  const [selectedId, setSelectedId] = useState<string>("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DecisionDialog>(null);
  const [notes, setNotes] = useState("");
  const [dialogError, setDialogError] = useState("");

  const load = async () => {
    setLoading(true);
    setMessage("");

    const { data: appRows, error: appError } = await supabase
      .from("organization_verification_applications")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (appError) {
      setMessage(appError.message);
      setLoading(false);
      return;
    }

    const apps = (appRows ?? []) as VerificationApplication[];
    setApplications(apps);

    if (!selectedId && apps.length) setSelectedId(apps[0].id);
    if (selectedId && !apps.some((item) => item.id === selectedId)) setSelectedId(apps[0]?.id ?? "");

    const orgIds = [...new Set(apps.map((item) => item.organization_id))];
    if (orgIds.length) {
      const { data: orgRows, error: orgError } = await supabase.from("organizations").select("*").in("id", orgIds);
      if (orgError) setMessage(orgError.message);
      setOrganizations(Object.fromEntries(((orgRows ?? []) as Organization[]).map((item) => [item.id, item])));
    } else {
      setOrganizations({});
    }

    const appIds = apps.map((item) => item.id);
    if (appIds.length) {
      const [{ data: docRows, error: docError }, { data: auditRows, error: auditError }] = await Promise.all([
        supabase
          .from("organization_verification_documents")
          .select("*")
          .in("application_id", appIds)
          .order("created_at", { ascending: true }),
        supabase
          .from("organization_verification_audit")
          .select("*")
          .in("application_id", appIds)
          .order("created_at", { ascending: false }),
      ]);

      if (docError) setMessage(docError.message);
      if (auditError) setMessage(auditError.message);

      const groupedDocs: Record<string, VerificationDocument[]> = {};
      ((docRows ?? []) as VerificationDocument[]).forEach((item) => {
        (groupedDocs[item.application_id] ??= []).push(item);
      });
      setDocuments(groupedDocs);

      const groupedAudit: Record<string, AuditEntry[]> = {};
      ((auditRows ?? []) as AuditEntry[]).forEach((item) => {
        (groupedAudit[item.application_id] ??= []).push(item);
      });
      setAudit(groupedAudit);
    } else {
      setDocuments({});
      setAudit({});
    }

    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return applications.filter((application) => {
      const organization = organizations[application.organization_id];
      const statusMatches = filter === "all" || application.status === filter;
      const searchMatches =
        !needle ||
        organization?.name.toLowerCase().includes(needle) ||
        organization?.registration_number.toLowerCase().includes(needle) ||
        application.representative_name.toLowerCase().includes(needle) ||
        application.work_email.toLowerCase().includes(needle);
      return statusMatches && searchMatches;
    });
  }, [applications, organizations, filter, query]);

  const selected = applications.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const selectedOrg = selected ? organizations[selected.organization_id] : null;
  const selectedDocs = selected ? documents[selected.id] ?? [] : [];
  const selectedAudit = selected ? audit[selected.id] ?? [] : [];
  // Replacement workflow: only the newest facility-registration document
  // determines whether the application is eligible for final approval.
  // Older rejected/replaced documents remain in the audit history but must
  // not block a newer accepted replacement.
  const facilityLicence = [...selectedDocs]
    .filter((doc) => doc.document_type === "facility_registration")
    .sort((a, b) => {
      const timeDifference =
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return timeDifference !== 0 ? timeDifference : b.id.localeCompare(a.id);
    })[0];

  const licenceAccepted = facilityLicence?.review_status === "accepted";

  const counts = useMemo(
    () => ({
      pending: applications.filter((item) => item.status === "pending").length,
      review: applications.filter((item) => item.status === "under_review").length,
      info: applications.filter((item) => item.status === "needs_more_information").length,
      approved: applications.filter((item) => item.status === "approved").length,
    }),
    [applications],
  );

  const openDocument = async (document: VerificationDocument) => {
    const { data, error } = await supabase.storage
      .from("hospital-verification")
      .createSignedUrl(document.storage_path, 120);
    if (error || !data?.signedUrl) {
      setMessage(error?.message || "Unable to open this document.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const showDecision = (next: DecisionDialog) => {
    setNotes("");
    setDialogError("");
    setDialog(next);
  };

  const submitDecision = async () => {
    if (!dialog) return;
    if (dialog.requireNotes && !notes.trim()) {
      setDialogError("Add a clear reason or instruction before confirming this decision.");
      return;
    }

    setDialogError("");
    setBusy(dialog.targetId);
    setMessage("");

    const { error } =
      dialog.kind === "application"
        ? await supabase.rpc("admin_review_hospital_application", {
            p_application_id: dialog.targetId,
            p_decision: dialog.decision,
            p_notes: notes.trim() || null,
          })
        : await supabase.rpc("admin_review_hospital_document", {
            p_document_id: dialog.targetId,
            p_decision: dialog.decision,
            p_notes: notes.trim() || null,
          });

    setBusy("");
    if (error) {
      setDialogError(error.message);
      setMessage(error.message);
      return;
    }

    setDialog(null);
    setNotes("");
    setDialogError("");
    setMessage("Review decision saved successfully.");
    await load();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <main className="portal-shell admin-console-shell">
      <aside className="portal-side admin-side">
        <div className="portal-brand admin-brand"><ShieldCheck />DMD-AI Admin</div>
        <nav className="admin-nav">
          <button className="active"><Building2 />Organization verification</button>
          <button onClick={() => document.getElementById("admin-audit")?.scrollIntoView({ behavior: "smooth" })}><History />Review history</button>
        </nav>
        <button className="portal-logout admin-logout" onClick={() => void signOut()}><LogOut />Sign out</button>
      </aside>

      <section className="portal-main admin-main">
        <header className="admin-header">
          <div>
            <span>ADMINISTRATION</span>
            <h1>Organization verification</h1>
            <p>Review healthcare organizations and their submitted evidence before clinical access is granted.</p>
          </div>
          <button className="admin-refresh" onClick={() => void load()} disabled={loading}><RefreshCw />Refresh</button>
        </header>

        {message && <div className="portal-message admin-message">{message}</div>}

        <section className="admin-stat-grid">
          <article><Clock3 /><div><strong>{counts.pending}</strong><span>Pending</span></div></article>
          <article><UserRoundCheck /><div><strong>{counts.review}</strong><span>Under review</span></div></article>
          <article><FileWarning /><div><strong>{counts.info}</strong><span>Needs information</span></div></article>
          <article><CheckCircle2 /><div><strong>{counts.approved}</strong><span>Approved</span></div></article>
        </section>

        <section className="admin-workspace">
          <aside className="admin-queue">
            <div className="admin-queue-head">
              <div><span>APPLICATION QUEUE</span><h2>Healthcare organizations</h2></div>
              <div className="admin-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search organization, licence or email" /></div>
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under review</option>
                <option value="needs_more_information">Needs information</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="admin-queue-list">
              {loading ? <div className="admin-queue-empty">Loading applications…</div> : filtered.length === 0 ? <div className="admin-queue-empty">No organizations match this view.</div> : filtered.map((application) => {
                const organization = organizations[application.organization_id];
                return (
                  <button key={application.id} className={selected?.id === application.id ? "selected" : ""} onClick={() => setSelectedId(application.id)}>
                    <div className="admin-queue-icon"><Building2 /></div>
                    <div className="admin-queue-copy">
                      <strong>{organization?.name || "Healthcare organization"}</strong>
                      <span>{organization ? `${organization.city}, ${organization.country}` : application.work_email}</span>
                      <em className={`status ${application.status}`}>{pretty(application.status)}</em>
                    </div>
                    <ChevronRight />
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="admin-review-panel">
            {!selected || !selectedOrg ? (
              <div className="admin-review-empty"><ShieldCheck /><h2>Select an application</h2><p>Choose an organization from the queue to review its information and documents.</p></div>
            ) : (
              <>
                <div className="admin-review-hero">
                  <div>
                    <span>ORGANIZATION APPLICATION</span>
                    <h2>{selectedOrg.name}</h2>
                    <p>{pretty(selectedOrg.facility_type)} · {selectedOrg.city}, {selectedOrg.country}</p>
                  </div>
                  <em className={`status ${selected.status}`}>{pretty(selected.status)}</em>
                </div>

                <div className="admin-detail-grid">
                  <article>
                    <div className="admin-section-heading"><Building2 /><div><span>ORGANIZATION</span><h3>Institution details</h3></div></div>
                    <dl>
                      <div><dt>Registration / licence</dt><dd>{selectedOrg.registration_number}</dd></div>
                      <div><dt>Facility type</dt><dd>{pretty(selectedOrg.facility_type)}</dd></div>
                      <div><dt>Country</dt><dd>{selectedOrg.country}</dd></div>
                      <div><dt>State / province</dt><dd>{selectedOrg.state_province || "Not provided"}</dd></div>
                      <div><dt>City</dt><dd>{selectedOrg.city}</dd></div>
                      <div className="wide"><dt>Official address</dt><dd>{selectedOrg.address}</dd></div>
                      <div><dt>Official phone</dt><dd>{selectedOrg.phone}</dd></div>
                      <div><dt>Website</dt><dd>{selectedOrg.website || "Not provided"}</dd></div>
                    </dl>
                  </article>

                  <article>
                    <div className="admin-section-heading"><UserRoundCheck /><div><span>REPRESENTATIVE</span><h3>Authorized contact</h3></div></div>
                    <dl>
                      <div><dt>Full name</dt><dd>{selected.representative_name}</dd></div>
                      <div><dt>Professional role</dt><dd>{pretty(selected.representative_role)}</dd></div>
                      <div><dt>Department</dt><dd>{selected.department || "Not provided"}</dd></div>
                      <div><dt>Professional licence</dt><dd>{selected.professional_license_number || "Not applicable / not provided"}</dd></div>
                      <div className="wide"><dt>Official work email</dt><dd>{selected.work_email}</dd></div>
                      <div className="wide"><dt>Submitted</dt><dd>{dateText(selected.submitted_at)}</dd></div>
                    </dl>
                  </article>
                </div>

                <section className="admin-document-section">
                  <div className="admin-section-heading"><FileCheck2 /><div><span>VERIFICATION EVIDENCE</span><h3>Submitted documents</h3><p>Review each document before making an organization-level decision.</p></div></div>
                  {selectedDocs.length === 0 ? <div className="admin-doc-empty">No verification documents are attached to this application.</div> : selectedDocs.map((document) => (
                    <article className="admin-document-card" key={document.id}>
                      <div className="admin-document-info">
                        <FileCheck2 />
                        <div>
                          <strong>{pretty(document.document_type)}</strong>
                          <span>{document.original_filename}{document.file_size_bytes ? ` · ${(document.file_size_bytes / 1024 / 1024).toFixed(2)} MB` : ""}</span>
                          <em className={`status ${document.review_status}`}>{pretty(document.review_status)}</em>
                          {document.reviewer_notes && <p>{document.reviewer_notes}</p>}
                        </div>
                      </div>
                      <div className="admin-document-actions">
                        <button onClick={() => void openDocument(document)}><Download />View document</button>
                        <button className="positive" disabled={busy === document.id} onClick={() => showDecision({ kind: "document", targetId: document.id, decision: "accepted", title: "Accept document", description: "Confirm that this document is acceptable evidence for this verification review.", requireNotes: false })}><CheckCircle2 />Accept</button>
                        <button className="warning" disabled={busy === document.id} onClick={() => showDecision({ kind: "document", targetId: document.id, decision: "needs_replacement", title: "Request replacement", description: "Explain what is missing, unclear, expired, or otherwise requires replacement.", requireNotes: true })}><FileWarning />Replace</button>
                        <button className="danger" disabled={busy === document.id} onClick={() => showDecision({ kind: "document", targetId: document.id, decision: "rejected", title: "Reject document", description: "Record why this document cannot be accepted as verification evidence.", requireNotes: true })}><XCircle />Reject</button>
                      </div>
                    </article>
                  ))}
                </section>

                <section className="admin-decision-section">
                  <div className="admin-decision-copy">
                    <span>FINAL REVIEW</span>
                    <h3>Organization decision</h3>
                    <p>{licenceAccepted ? "The required facility registration / licence has been accepted. You may continue with the organization-level decision." : "The required facility registration / licence must be reviewed and accepted before this organization can be approved."}</p>
                  </div>
                  <div className="admin-final-actions">
                    <button disabled={busy === selected.id || selected.status === "approved" || selected.status === "under_review"} onClick={() => showDecision({ kind: "application", targetId: selected.id, decision: "under_review", title: "Start review", description: "Mark this application as actively under review.", requireNotes: false })}><Clock3 />{selected.status === "under_review" ? "Review in progress" : "Start review"}</button>
                    <button className="warning" disabled={busy === selected.id || selected.status === "approved"} onClick={() => showDecision({ kind: "application", targetId: selected.id, decision: "needs_more_information", title: "Request more information", description: "Tell the organization exactly what additional information or evidence is required.", requireNotes: true })}><FileWarning />Request information</button>
                    <button className="positive" disabled={busy === selected.id || !licenceAccepted || selected.status === "approved"} onClick={() => showDecision({ kind: "application", targetId: selected.id, decision: "approved", title: "Approve organization", description: "Approval grants this verified organization access to the clinical workspace. Confirm only after completing the verification review.", requireNotes: false })}><CheckCircle2 />Approve organization</button>
                    <button className="danger" disabled={busy === selected.id || selected.status === "approved"} onClick={() => showDecision({ kind: "application", targetId: selected.id, decision: "rejected", title: "Reject application", description: "Record the reason this organization cannot be approved.", requireNotes: true })}><XCircle />Reject application</button>
                  </div>
                </section>

                <section className="admin-audit-section" id="admin-audit">
                  <div className="admin-section-heading"><History /><div><span>REVIEW HISTORY</span><h3>Audit trail</h3></div></div>
                  {selectedAudit.length === 0 ? <div className="admin-doc-empty">No review actions have been recorded yet.</div> : <div className="admin-audit-list">{selectedAudit.map((entry) => (
                    <article key={entry.id}>
                      <div className="admin-audit-dot" />
                      <div><strong>{pretty(entry.action)}</strong><span>{entry.from_status ? `${pretty(entry.from_status)} → ${pretty(entry.to_status)}` : pretty(entry.to_status)}</span>{entry.notes && <p>{entry.notes}</p>}<time>{dateText(entry.created_at)}</time></div>
                    </article>
                  ))}</div>}
                </section>
              </>
            )}
          </section>
        </section>
      </section>

      {dialog && (
        <div className="modal-backdrop admin-dialog-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setDialog(null); }}>
          <div className="portal-modal admin-decision-dialog">
            <div className="admin-dialog-icon">{dialog.decision === "approved" || dialog.decision === "accepted" ? <CheckCircle2 /> : dialog.decision === "rejected" ? <XCircle /> : <FileWarning />}</div>
            <div><h2>{dialog.title}</h2><p>{dialog.description}</p></div>
            <label>
              Review note {dialog.requireNotes ? <strong>Required</strong> : <span>Optional</span>}
              <textarea
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  if (dialogError) setDialogError("");
                }}
                placeholder={dialog.requireNotes ? "Enter a clear reason or instruction…" : "Add a reviewer note if needed…"}
              />
            </label>
            {dialogError && <div className="admin-dialog-error">{dialogError}</div>}
            <div className="modal-actions">
              <button className="secondary" type="button" onClick={() => { setDialogError(""); setDialog(null); }} disabled={Boolean(busy)}>Cancel</button>
              <button
                type="button"
                disabled={Boolean(busy) || (dialog.requireNotes && !notes.trim())}
                onClick={() => void submitDecision()}
              >
                {busy ? "Saving decision..." : "Confirm decision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
