import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Dna,
  FileText,
  FolderOpen,
  Heart,
  Home,
  LogOut,
  MessageSquareText,
  Pill,
  Plus,
  Stethoscope,
  Upload,
  UserRound,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../styles/portal.css";

type ViewKey =
  | "overview"
  | "members"
  | "documents"
  | "journey"
  | "appointments"
  | "genetics"
  | "medications"
  | "careteam"
  | "questions"
  | "resources";

type QuickFormKind = "appointment" | "question" | "contact" | "genetics" | "medication" | "event";

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  relationship_to_family: string | null;
};

type FamilyAppointment = { id:string; patient_id:string; title:string; appointment_at:string; provider_name:string|null; specialty:string|null; location:string|null; notes:string|null; status:string };
type FamilyQuestion = { id:string; patient_id:string; question:string; answered:boolean; answer_notes:string|null; created_at:string };
type CareContact = { id:string; patient_id:string; full_name:string; role:string|null; organization:string|null; phone:string|null; email:string|null };
type GeneticRecord = { id:string; patient_id:string; test_date:string|null; laboratory:string|null; test_type:string|null; result_status:string; variant_summary:string|null; notes:string|null };
type Medication = { id:string; patient_id:string; medication_name:string; dose:string|null; frequency:string|null; prescribing_clinician:string|null; active:boolean };
type CareEvent = { id:string; patient_id:string; event_date:string; event_type:string; title:string; notes:string|null };
type FamilyDocument = { id:string; patient_id:string; original_filename:string; document_type:string; storage_path:string; created_at:string };

const navItems: Array<{ key: ViewKey; label: string; icon: typeof Home }> = [
  { key: "overview", label: "Overview", icon: Home },
  { key: "members", label: "Family Members", icon: Users },
  { key: "documents", label: "Medical Records", icon: FileText },
  { key: "journey", label: "Care Journey", icon: ClipboardList },
  { key: "appointments", label: "Appointments", icon: CalendarDays },
  { key: "genetics", label: "Genetics & Testing", icon: Dna },
  { key: "medications", label: "Medications", icon: Pill },
  { key: "careteam", label: "Care Team", icon: UserRoundCheck },
  { key: "questions", label: "Questions", icon: MessageSquareText },
  { key: "resources", label: "Resources", icon: BookOpen },
];

export default function FamilyPortal({ embeddedView }: { embeddedView?: ViewKey } = {}) {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewKey>(embeddedView || "overview");
  const [name, setName] = useState("Family");
  const [email, setEmail] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [documents, setDocuments] = useState<FamilyDocument[]>([]);
  const [appointments, setAppointments] = useState<FamilyAppointment[]>([]);
  const [questions, setQuestions] = useState<FamilyQuestion[]>([]);
  const [contacts, setContacts] = useState<CareContact[]>([]);
  const [genetics, setGenetics] = useState<GeneticRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [careEvents, setCareEvents] = useState<CareEvent[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [quickForm, setQuickForm] = useState<QuickFormKind | null>(null);
  const [dataForm, setDataForm] = useState<Record<string,string>>({});
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadPatientId, setUploadPatientId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [activeResource, setActiveResource] = useState<"understand" | "genetics" | "care" | null>(null);
  const [form, setForm] = useState({ first_name:"", last_name:"", date_of_birth:"", relationship_to_family:"" });

  const firstName = useMemo(() => name.trim().split(/\s+/)[0] || "Family", [name]);
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return `${parts[0]?.[0] ?? "F"}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }, [name]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0] || null;
  const forSelected = <T extends { patient_id:string }>(rows:T[]) => selectedPatient ? rows.filter((r) => r.patient_id === selectedPatient.id) : rows;

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }

    setEmail(user.email ?? "");
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    setName(profile?.full_name || user.user_metadata?.full_name || "Family");

    const { data: patientRows } = await supabase
      .from("patients")
      .select("id,first_name,last_name,date_of_birth,relationship_to_family")
      .eq("family_owner_id", user.id)
      .order("created_at", { ascending:false });

    const nextPatients = patientRows || [];
    setPatients(nextPatients);
    if (nextPatients.length === 0) {
      setSelectedPatientId("");
      setDocuments([]); setAppointments([]); setQuestions([]); setContacts([]); setGenetics([]); setMedications([]); setCareEvents([]);
      return;
    }

    setSelectedPatientId((current) => current && nextPatients.some((p) => p.id === current) ? current : nextPatients[0].id);
    const ids = nextPatients.map((p) => p.id);
    const [d,a,q,c,g,m,e] = await Promise.all([
      supabase.from("patient_documents").select("id,patient_id,original_filename,document_type,storage_path,created_at").in("patient_id",ids).order("created_at",{ascending:false}),
      supabase.from("family_appointments").select("*").in("patient_id",ids).order("appointment_at",{ascending:true}),
      supabase.from("family_questions").select("*").in("patient_id",ids).order("created_at",{ascending:false}),
      supabase.from("family_care_team_contacts").select("*").in("patient_id",ids).order("created_at",{ascending:false}),
      supabase.from("family_genetic_records").select("*").in("patient_id",ids).order("created_at",{ascending:false}),
      supabase.from("family_medications").select("*").in("patient_id",ids).order("created_at",{ascending:false}),
      supabase.from("family_care_events").select("*").in("patient_id",ids).order("event_date",{ascending:false}),
    ]);
    setDocuments(d.data || []); setAppointments(a.data || []); setQuestions(q.data || []); setContacts(c.data || []); setGenetics(g.data || []); setMedications(m.data || []); setCareEvents(e.data || []);
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (embeddedView) setActiveView(embeddedView); }, [embeddedView]);

  const changeView = (view:ViewKey) => {
    setActiveView(view);
    setActiveResource(null);
    setMsg("");
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  const addFamilyMember = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMsg("");
    const { data:{user} } = await supabase.auth.getUser(); if (!user) return;
    const { error } = await supabase.from("patients").insert({ family_owner_id:user.id, organization_id:null, created_by:user.id, ...form, date_of_birth:form.date_of_birth || null });
    if (error) { setMsg(error.message); return; }
    setForm({ first_name:"", last_name:"", date_of_birth:"", relationship_to_family:"" });
    setShowMemberModal(false); setMsg("Family member added successfully."); await load();
  };

  const uploadDocument = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMsg("");
    if (!uploadPatientId) { setMsg("Choose the family member this document belongs to."); return; }
    if (!uploadFile) { setMsg("Choose a PDF, JPG or PNG document to upload."); return; }
    const allowed = ["application/pdf","image/jpeg","image/png"];
    if (!allowed.includes(uploadFile.type)) { setMsg("Only PDF, JPG and PNG files are supported."); return; }
    if (uploadFile.size > 20*1024*1024) { setMsg("The document must be smaller than 20 MB."); return; }
    const { data:{user} } = await supabase.auth.getUser(); if (!user) return;
    try {
      setBusy(true);
      const ext = uploadFile.name.split(".").pop()?.toLowerCase() || "file";
      const storagePath = `${user.id}/${uploadPatientId}/${crypto.randomUUID()}.${ext}`;
      const { error:storageError } = await supabase.storage.from("patient-documents").upload(storagePath, uploadFile, { upsert:false, contentType:uploadFile.type });
      if (storageError) throw storageError;
      const { error:metaError } = await supabase.from("patient_documents").insert({ patient_id:uploadPatientId, uploaded_by:user.id, document_type:"medical_report", storage_path:storagePath, original_filename:uploadFile.name, mime_type:uploadFile.type, file_size_bytes:uploadFile.size });
      if (metaError) { await supabase.storage.from("patient-documents").remove([storagePath]); throw metaError; }
      setUploadFile(null); setUploadPatientId(""); setShowUploadModal(false); setMsg("Document uploaded securely."); await load();
    } catch (error) { setMsg(error instanceof Error ? error.message : "Document upload failed."); }
    finally { setBusy(false); }
  };

  const openDocument = async (document:FamilyDocument) => {
    const { data, error } = await supabase.storage.from("patient-documents").createSignedUrl(document.storage_path, 60);
    if (error || !data?.signedUrl) { setMsg(error?.message || "Unable to open this document."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const openQuickForm = (kind:QuickFormKind, patientId?:string) => {
    if (patientId) setSelectedPatientId(patientId);
    if (!patientId && !selectedPatientId && patients[0]) setSelectedPatientId(patients[0].id);
    setDataForm({}); setQuickForm(kind);
  };

  const saveQuickData = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMsg("");
    const { data:{user} } = await supabase.auth.getUser();
    const patientId = selectedPatientId || patients[0]?.id;
    if (!user || !patientId || !quickForm) { setMsg("Choose a family member first."); return; }
    let table = ""; let payload:Record<string,unknown> = { patient_id:patientId, created_by:user.id };
    if (quickForm === "appointment") { table="family_appointments"; payload={...payload,title:dataForm.title,appointment_at:dataForm.appointment_at,provider_name:dataForm.provider_name||null,specialty:dataForm.specialty||null,location:dataForm.location||null,notes:dataForm.notes||null}; }
    if (quickForm === "question") { table="family_questions"; payload={...payload,question:dataForm.question}; }
    if (quickForm === "contact") { table="family_care_team_contacts"; payload={...payload,full_name:dataForm.full_name,role:dataForm.role||null,organization:dataForm.organization||null,phone:dataForm.phone||null,email:dataForm.email||null,notes:dataForm.notes||null}; }
    if (quickForm === "genetics") { table="family_genetic_records"; payload={...payload,test_date:dataForm.test_date||null,laboratory:dataForm.laboratory||null,test_type:dataForm.test_type||null,result_status:dataForm.result_status||"unknown",variant_summary:dataForm.variant_summary||null,notes:dataForm.notes||null}; }
    if (quickForm === "medication") { table="family_medications"; payload={...payload,medication_name:dataForm.medication_name,dose:dataForm.dose||null,frequency:dataForm.frequency||null,prescribing_clinician:dataForm.prescribing_clinician||null,notes:dataForm.notes||null,active:true}; }
    if (quickForm === "event") { table="family_care_events"; payload={...payload,event_date:dataForm.event_date,event_type:dataForm.event_type||"note",title:dataForm.title,notes:dataForm.notes||null}; }
    const { error } = await supabase.from(table).insert(payload);
    if (error) { setMsg(error.message); return; }
    setQuickForm(null); setDataForm({}); setMsg("Saved successfully."); await load();
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  const patientSelector = (
    <label className="family-patient-selector">
      <span>Family member</span>
      <select value={selectedPatient?.id || ""} onChange={(e) => setSelectedPatientId(e.target.value)} disabled={!patients.length}>
        {!patients.length && <option value="">No family member added</option>}
        {patients.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
      </select>
    </label>
  );

  const emptyWithAction = (title:string, text:string, actionLabel:string, action:()=>void) => (
    <div className="family-empty-state family-workspace-empty">
      <div className="family-empty-icon"><FolderOpen /></div>
      <h3>{title}</h3>
      <p>{text}</p>
      <button type="button" onClick={action}><Plus /> {actionLabel}</button>
    </div>
  );

  return (
    <main className={`portal-shell family-portal-shell ${embeddedView ? "family-embedded-portal" : ""}`}>
      {!embeddedView && <aside className="portal-sidebar family-side">
        <button className="portal-brand family-brand" type="button" onClick={() => changeView("overview")}>
          <Heart />
          <span><strong>DMD-AI</strong><small>Family Portal</small></span>
        </button>

        <nav className="family-nav" aria-label="Family portal navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.key} type="button" className={activeView === item.key ? "active" : ""} onClick={() => changeView(item.key)}><Icon /> {item.label}</button>;
          })}
        </nav>

        <div className="family-sidebar-profile">
          <div className="family-sidebar-avatar">{initials}</div>
          <div><strong>{name}</strong><span>{email}</span></div>
        </div>
        <button className="portal-logout family-signout-button" type="button" onClick={signOut}><span className="family-signout-icon"><LogOut /></span><span className="family-signout-copy"><strong>Sign out</strong><small>Leave Family Portal</small></span></button>
      </aside>}

      <section className={`portal-main family-main family-workspace-main family-view-${activeView}`}>
        {!embeddedView && <header className="family-header family-workspace-header">
          <div>
            <span>FAMILY PORTAL</span>
            <h1>{activeView === "overview" ? `Welcome back, ${firstName}` : navItems.find((item) => item.key === activeView)?.label}</h1>
            <p>{
              activeView === "overview" ? "Keep your family's DMD-related information organized and ready when you need it." :
              activeView === "members" ? "Manage the family profiles connected to this account." :
              activeView === "documents" ? "Store and open medical reports, test documents and other records securely." :
              activeView === "journey" ? "Build a dated timeline of important care events, changes and milestones." :
              activeView === "appointments" ? "Keep upcoming and past appointments organized for each family member." :
              activeView === "genetics" ? "Record genetic testing information and keep result summaries together." :
              activeView === "medications" ? "Maintain a clear list of current medicines, doses and prescribing clinicians." :
              activeView === "careteam" ? "Keep contact information for the professionals and organizations involved in care." :
              activeView === "questions" ? "Prepare questions before appointments so important topics are not forgotten." :
              "Plain-language DMD information designed for families and caregivers."
            }</p>
          </div>
          {activeView === "overview" && <div className="family-header-actions"><button className="family-secondary-action" type="button" onClick={() => setShowUploadModal(true)} disabled={!patients.length}><Upload /> Upload report</button><button className="family-primary-action" type="button" onClick={() => setShowMemberModal(true)}><Plus /> Add family member</button></div>}
        </header>}

        {msg && <div className="portal-message family-message">{msg}</div>}

        {activeView === "overview" && (
          <>
            <section className="family-summary-grid">
              <article className="family-welcome-card"><div className="family-welcome-icon"><Heart /></div><div><span>YOUR FAMILY SPACE</span><h2>Everything important, easier to find.</h2><p>Use the sidebar to manage each part of the family record. Information entered here is stored in the secure DMD-AI backend and connected to the correct family member.</p></div></article>
              <article className="family-stat-card"><Users /><div><strong>{patients.length}</strong><span>Family members</span></div><p>Profiles connected to your account.</p></article>
              <article className="family-stat-card"><FolderOpen /><div><strong>{documents.length}</strong><span>Medical records</span></div><p>Reports and documents stored securely.</p></article>
            </section>

            <section className="portal-section family-section-card">
              <div className="section-title family-section-title"><div><span>QUICK ACCESS</span><h2>Continue where you need to</h2><p>These shortcuts open the full workspace for that task.</p></div></div>
              <div className="family-hub-grid family-overview-shortcuts">
                <button type="button" onClick={() => changeView("members")}><Users/><div><strong>Family members</strong><span>Profiles and personal information.</span></div><ChevronRight/></button>
                <button type="button" onClick={() => changeView("documents")}><FileText/><div><strong>Medical records</strong><span>Reports, test files and uploads.</span></div><ChevronRight/></button>
                <button type="button" onClick={() => changeView("appointments")}><CalendarDays/><div><strong>Appointments</strong><span>Upcoming visits and providers.</span></div><ChevronRight/></button>
                <button type="button" onClick={() => changeView("genetics")}><Dna/><div><strong>Genetics & testing</strong><span>Testing history and summaries.</span></div><ChevronRight/></button>
                <button type="button" onClick={() => changeView("medications")}><Pill/><div><strong>Medications</strong><span>Medicine list and dose details.</span></div><ChevronRight/></button>
                <button type="button" onClick={() => changeView("careteam")}><UserRoundCheck/><div><strong>Care team</strong><span>Important clinicians and contacts.</span></div><ChevronRight/></button>
              </div>
            </section>

            <section className="portal-section family-section-card family-resources-section">
              <div className="section-title family-section-title"><div><span>EDUCATION & SUPPORT</span><h2>Useful starting points</h2><p>Open a family-friendly guide inside this portal.</p></div></div>
              <div className="family-resource-grid">
                <button type="button" onClick={() => { changeView("resources"); setActiveResource("understand"); }}><BookOpen/><div><strong>Understand DMD</strong><span>Plain-language overview of DMD and progression.</span></div><ChevronRight/></button>
                <button type="button" onClick={() => { changeView("resources"); setActiveResource("genetics"); }}><Dna/><div><strong>Genetics & testing</strong><span>Inheritance, genetic testing and carrier testing.</span></div><ChevronRight/></button>
                <button type="button" onClick={() => { changeView("resources"); setActiveResource("care"); }}><Heart/><div><strong>Care & family support</strong><span>Practical preparation and multidisciplinary care.</span></div><ChevronRight/></button>
              </div>
            </section>
          </>
        )}

        {activeView === "members" && (
          <section className="portal-section family-section-card">
            <div className="section-title family-section-title"><div><span>YOUR FAMILY</span><h2>Family members</h2><p>Choose a family member to make them the active profile across the portal.</p></div><button type="button" onClick={() => setShowMemberModal(true)}><Plus/> Add member</button></div>
            {!patients.length ? emptyWithAction("Add your first family member","Create the profile of the person whose information you want to organize.","Add family member",()=>setShowMemberModal(true)) : <div className="family-member-grid">{patients.map((patient) => <article className={`family-member-card ${selectedPatientId === patient.id ? "selected" : ""}`} key={patient.id}><div className="family-member-avatar">{patient.first_name[0]}{patient.last_name[0]}</div><div className="family-member-copy"><strong>{patient.first_name} {patient.last_name}</strong><span>{patient.relationship_to_family || "Family member"}</span><small>{patient.date_of_birth ? `Date of birth: ${patient.date_of_birth}` : "Date of birth not added"}</small></div><button type="button" onClick={() => { setSelectedPatientId(patient.id); changeView("documents"); }} aria-label={`Open ${patient.first_name}'s records`}><ChevronRight/></button></article>)}</div>}
          </section>
        )}

        {activeView === "documents" && (
          <section className="portal-section family-section-card">
            <div className="section-title family-section-title"><div><span>MEDICAL RECORDS</span><h2>Documents</h2><p>Upload reports and open existing files without leaving the Family Portal.</p></div><button type="button" onClick={() => { setUploadPatientId(selectedPatient?.id || ""); setShowUploadModal(true); }} disabled={!patients.length}><Upload/> Upload record</button></div>
            {patientSelector}
            {!forSelected(documents).length ? emptyWithAction("No records for this family member","Upload a medical report, laboratory result, genetic-test document or other relevant record.","Upload record",()=>{ setUploadPatientId(selectedPatient?.id || ""); setShowUploadModal(true); }) : <div className="family-document-list family-full-list">{forSelected(documents).map((document)=><button className="family-document-row family-document-button" key={document.id} type="button" onClick={()=>void openDocument(document)}><div className="family-document-icon"><FileText/></div><div><strong>{document.original_filename}</strong><span>{document.document_type.replaceAll("_"," ")}</span></div><small>{new Date(document.created_at).toLocaleDateString()}</small><ChevronRight/></button>)}</div>}
          </section>
        )}

        {activeView === "journey" && (
          <section className="portal-section family-section-card">
            <div className="section-title family-section-title"><div><span>CARE JOURNEY</span><h2>Timeline & milestones</h2><p>Record important changes, tests, treatment events and milestones over time.</p></div><button type="button" onClick={()=>openQuickForm("event")} disabled={!patients.length}><Plus/> Add event</button></div>
            {patientSelector}
            {!forSelected(careEvents).length ? emptyWithAction("No care events yet","Add the first milestone or care event for this family member.","Add care event",()=>openQuickForm("event")) : <div className="family-timeline">{forSelected(careEvents).map((item)=><article key={item.id}><div className="family-timeline-dot"/><div><small>{new Date(item.event_date).toLocaleDateString()} • {item.event_type.replaceAll("_"," ")}</small><strong>{item.title}</strong>{item.notes && <p>{item.notes}</p>}</div></article>)}</div>}
          </section>
        )}

        {activeView === "appointments" && (
          <section className="portal-section family-section-card">
            <div className="section-title family-section-title"><div><span>APPOINTMENTS</span><h2>Visits & follow-up</h2><p>Keep date, provider, specialty, location and notes together.</p></div><button type="button" onClick={()=>openQuickForm("appointment")} disabled={!patients.length}><Plus/> Add appointment</button></div>
            {patientSelector}
            {!forSelected(appointments).length ? emptyWithAction("No appointments saved","Add an upcoming or past appointment to keep the care schedule organized.","Add appointment",()=>openQuickForm("appointment")) : <div className="family-record-list family-record-grid">{forSelected(appointments).map((a)=><article key={a.id}><CalendarDays/><div><strong>{a.title}</strong><span>{new Date(a.appointment_at).toLocaleString()}</span><small>{[a.provider_name,a.specialty,a.location].filter(Boolean).join(" • ") || "Appointment"}</small>{a.notes && <p>{a.notes}</p>}</div></article>)}</div>}
          </section>
        )}

        {activeView === "genetics" && (
          <section className="portal-section family-section-card">
            <div className="section-title family-section-title"><div><span>GENETICS & TESTING</span><h2>Genetic-test records</h2><p>Keep test dates, laboratories, result status and summaries connected to the right person.</p></div><button type="button" onClick={()=>openQuickForm("genetics")} disabled={!patients.length}><Plus/> Add test record</button></div>
            {patientSelector}
            {!forSelected(genetics).length ? emptyWithAction("No genetic-test records","Add a record when genetic testing is ordered, pending or completed.","Add test record",()=>openQuickForm("genetics")) : <div className="family-record-list family-record-grid">{forSelected(genetics).map((g)=><article key={g.id}><Dna/><div><strong>{g.test_type || "Genetic test"}</strong><span>Status: {g.result_status}</span><small>{[g.test_date,g.laboratory].filter(Boolean).join(" • ") || "Details not added"}</small>{g.variant_summary && <p>{g.variant_summary}</p>}</div></article>)}</div>}
          </section>
        )}

        {activeView === "medications" && (
          <section className="portal-section family-section-card">
            <div className="section-title family-section-title"><div><span>MEDICATIONS</span><h2>Medication list</h2><p>Maintain an up-to-date record of medication names, doses and frequencies.</p></div><button type="button" onClick={()=>openQuickForm("medication")} disabled={!patients.length}><Plus/> Add medication</button></div>
            {patientSelector}
            {!forSelected(medications).length ? emptyWithAction("No medications saved","Add current medications so the family has one clear reference list.","Add medication",()=>openQuickForm("medication")) : <div className="family-record-list family-record-grid">{forSelected(medications).map((m)=><article key={m.id}><Pill/><div><strong>{m.medication_name}</strong><span>{[m.dose,m.frequency].filter(Boolean).join(" • ") || "Dose/frequency not added"}</span><small>{m.prescribing_clinician ? `Prescribed by ${m.prescribing_clinician}` : "Prescribing clinician not added"}</small></div></article>)}</div>}
          </section>
        )}

        {activeView === "careteam" && (
          <section className="portal-section family-section-card">
            <div className="section-title family-section-title"><div><span>CARE TEAM</span><h2>Important care contacts</h2><p>Keep clinicians, specialties, hospitals and contact details in one place.</p></div><button type="button" onClick={()=>openQuickForm("contact")} disabled={!patients.length}><Plus/> Add contact</button></div>
            {patientSelector}
            {!forSelected(contacts).length ? emptyWithAction("No care-team contacts","Add a clinician, therapist, genetic counsellor or other professional involved in care.","Add contact",()=>openQuickForm("contact")) : <div className="family-record-list family-record-grid">{forSelected(contacts).map((c)=><article key={c.id}><Stethoscope/><div><strong>{c.full_name}</strong><span>{[c.role,c.organization].filter(Boolean).join(" • ") || "Care-team contact"}</span><small>{[c.phone,c.email].filter(Boolean).join(" • ") || "Contact details not added"}</small></div></article>)}</div>}
          </section>
        )}

        {activeView === "questions" && (
          <section className="portal-section family-section-card">
            <div className="section-title family-section-title"><div><span>QUESTIONS</span><h2>Questions for the care team</h2><p>Write questions down before appointments and keep the discussion focused.</p></div><button type="button" onClick={()=>openQuickForm("question")} disabled={!patients.length}><Plus/> Add question</button></div>
            {patientSelector}
            {!forSelected(questions).length ? emptyWithAction("No questions saved","Add anything you want to remember to discuss with the care team.","Add question",()=>openQuickForm("question")) : <div className="family-question-list">{forSelected(questions).map((q)=><article key={q.id}><div className="family-question-status">{q.answered ? "Answered" : "To discuss"}</div><strong>{q.question}</strong>{q.answer_notes && <p>{q.answer_notes}</p>}<small>Added {new Date(q.created_at).toLocaleDateString()}</small></article>)}</div>}
          </section>
        )}

        {activeView === "resources" && (
          <section className="portal-section family-section-card family-resources-section">
            <div className="section-title family-section-title"><div><span>EDUCATION & SUPPORT</span><h2>Family resource center</h2><p>Choose a topic to read the full explanation inside your portal.</p></div></div>
            <div className="family-resource-grid">
              <button type="button" onClick={()=>setActiveResource("understand")}><BookOpen/><div><strong>Understand DMD</strong><span>What DMD is, common early features and how it progresses.</span></div><ChevronRight/></button>
              <button type="button" onClick={()=>setActiveResource("genetics")}><Dna/><div><strong>Genetics & testing</strong><span>DMD inheritance, testing and carrier information.</span></div><ChevronRight/></button>
              <button type="button" onClick={()=>setActiveResource("care")}><Heart/><div><strong>Care & family support</strong><span>Preparing for care, monitoring and multidisciplinary support.</span></div><ChevronRight/></button>
            </div>
            {activeResource && <article className="family-resource-detail">
              <div className="family-resource-detail-header"><div><span>FAMILY GUIDE</span><h3>{activeResource === "understand" ? "Understanding Duchenne muscular dystrophy" : activeResource === "genetics" ? "Genetics, inheritance and DMD testing" : "Care, monitoring and family support"}</h3></div><button type="button" onClick={()=>setActiveResource(null)}><X/> Close</button></div>
              {activeResource === "understand" && <div className="family-resource-detail-body"><p>Duchenne muscular dystrophy (DMD) is a genetic neuromuscular condition caused by changes in the DMD gene that affect dystrophin, a protein important for muscle function. Symptoms usually begin in childhood, but the exact pattern and timing can differ between people.</p><div className="family-resource-info-grid"><div><strong>Early features</strong><p>Families may notice delayed motor milestones, difficulty running or climbing stairs, frequent falls, or difficulty rising from the floor. These signs are not diagnostic on their own.</p></div><div><strong>How diagnosis is investigated</strong><p>Clinical evaluation may include CK testing and, importantly, molecular genetic testing of the DMD gene. Specialists decide which tests are appropriate.</p></div><div><strong>Why ongoing care matters</strong><p>DMD affects more than skeletal muscle, so multidisciplinary follow-up can include cardiac, respiratory, rehabilitation, bone-health and other care.</p></div></div></div>}
              {activeResource === "genetics" && <div className="family-resource-detail-body"><p>DMD is usually inherited in an X-linked pattern. Genetic testing can identify disease-causing changes in the DMD gene and can help guide diagnosis, family counselling and, in some situations, treatment eligibility.</p><div className="family-resource-info-grid"><div><strong>DMD gene testing</strong><p>Testing may identify deletions, duplications or smaller sequence variants. The laboratory report should be interpreted by qualified professionals.</p></div><div><strong>Carrier testing</strong><p>When an appropriate familial variant is known, relatives may be offered carrier testing and genetic counselling depending on their circumstances.</p></div><div><strong>Family planning</strong><p>Genetic counsellors can explain reproductive options and recurrence risks based on the family's confirmed genetic findings.</p></div></div></div>}
              {activeResource === "care" && <div className="family-resource-detail-body"><p>DMD care is usually multidisciplinary. Families may work with neurology, cardiology, respiratory care, physiotherapy, rehabilitation, genetics and other specialists depending on the person's needs.</p><div className="family-resource-info-grid"><div><strong>Before appointments</strong><p>Bring recent reports, note changes you have observed, keep medication details current and prepare questions for the care team.</p></div><div><strong>Ongoing monitoring</strong><p>Follow-up can include mobility and functional assessments together with cardiac, respiratory, bone-health and other monitoring recommended by the care team.</p></div><div><strong>Family support</strong><p>Practical, educational and emotional support can matter throughout the journey. Use this portal to keep information organized and easier to discuss.</p></div></div></div>}
            </article>}
          </section>
        )}

        <p className="family-clinical-note">DMD-AI helps organize information and provide educational support. Diagnosis and treatment decisions should remain with qualified healthcare professionals.</p>

        {quickForm && <div className="modal-backdrop"><form className="portal-modal family-modal family-data-modal" onSubmit={saveQuickData}>
          <div className="family-modal-heading"><div className="family-modal-icon"><Plus/></div><div><h2>{({appointment:"Add appointment",question:"Add question",contact:"Add care-team contact",genetics:"Add genetic test",medication:"Add medication",event:"Add care milestone"} as Record<string,string>)[quickForm]}</h2><p>This information is saved to the selected family member's record.</p></div></div>
          <label>Family member<select required value={selectedPatientId} onChange={e=>setSelectedPatientId(e.target.value)}><option value="">Select family member</option>{patients.map(p=><option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}</select></label>
          {quickForm==="appointment"&&<><label>Appointment title<input required value={dataForm.title||""} onChange={e=>setDataForm({...dataForm,title:e.target.value})}/></label><label>Date & time<input required type="datetime-local" value={dataForm.appointment_at||""} onChange={e=>setDataForm({...dataForm,appointment_at:e.target.value})}/></label><label>Clinician / provider<input value={dataForm.provider_name||""} onChange={e=>setDataForm({...dataForm,provider_name:e.target.value})}/></label><label>Specialty<input placeholder="Neurology, cardiology..." value={dataForm.specialty||""} onChange={e=>setDataForm({...dataForm,specialty:e.target.value})}/></label><label>Location<input value={dataForm.location||""} onChange={e=>setDataForm({...dataForm,location:e.target.value})}/></label><label>Notes<textarea rows={3} value={dataForm.notes||""} onChange={e=>setDataForm({...dataForm,notes:e.target.value})}/></label></>}
          {quickForm==="question"&&<label>Question<textarea required rows={4} placeholder="What do you want to ask the care team?" value={dataForm.question||""} onChange={e=>setDataForm({...dataForm,question:e.target.value})}/></label>}
          {quickForm==="contact"&&<><label>Full name<input required value={dataForm.full_name||""} onChange={e=>setDataForm({...dataForm,full_name:e.target.value})}/></label><label>Role / specialty<input value={dataForm.role||""} onChange={e=>setDataForm({...dataForm,role:e.target.value})}/></label><label>Hospital / organization<input value={dataForm.organization||""} onChange={e=>setDataForm({...dataForm,organization:e.target.value})}/></label><label>Phone<input value={dataForm.phone||""} onChange={e=>setDataForm({...dataForm,phone:e.target.value})}/></label><label>Email<input type="email" value={dataForm.email||""} onChange={e=>setDataForm({...dataForm,email:e.target.value})}/></label><label>Notes<textarea rows={3} value={dataForm.notes||""} onChange={e=>setDataForm({...dataForm,notes:e.target.value})}/></label></>}
          {quickForm==="genetics"&&<><label>Test date<input type="date" value={dataForm.test_date||""} onChange={e=>setDataForm({...dataForm,test_date:e.target.value})}/></label><label>Test type<input placeholder="DMD gene testing..." value={dataForm.test_type||""} onChange={e=>setDataForm({...dataForm,test_type:e.target.value})}/></label><label>Laboratory<input value={dataForm.laboratory||""} onChange={e=>setDataForm({...dataForm,laboratory:e.target.value})}/></label><label>Result status<select value={dataForm.result_status||"unknown"} onChange={e=>setDataForm({...dataForm,result_status:e.target.value})}><option value="unknown">Unknown</option><option value="pending">Pending</option><option value="positive">Positive</option><option value="negative">Negative</option><option value="inconclusive">Inconclusive</option></select></label><label>Variant / result summary<textarea rows={3} value={dataForm.variant_summary||""} onChange={e=>setDataForm({...dataForm,variant_summary:e.target.value})}/></label><label>Notes<textarea rows={3} value={dataForm.notes||""} onChange={e=>setDataForm({...dataForm,notes:e.target.value})}/></label></>}
          {quickForm==="medication"&&<><label>Medication name<input required value={dataForm.medication_name||""} onChange={e=>setDataForm({...dataForm,medication_name:e.target.value})}/></label><label>Dose<input placeholder="e.g. 10 mg" value={dataForm.dose||""} onChange={e=>setDataForm({...dataForm,dose:e.target.value})}/></label><label>Frequency<input placeholder="e.g. once daily" value={dataForm.frequency||""} onChange={e=>setDataForm({...dataForm,frequency:e.target.value})}/></label><label>Prescribing clinician<input value={dataForm.prescribing_clinician||""} onChange={e=>setDataForm({...dataForm,prescribing_clinician:e.target.value})}/></label><label>Notes<textarea rows={3} value={dataForm.notes||""} onChange={e=>setDataForm({...dataForm,notes:e.target.value})}/></label></>}
          {quickForm==="event"&&<><label>Date<input required type="date" value={dataForm.event_date||""} onChange={e=>setDataForm({...dataForm,event_date:e.target.value})}/></label><label>Title<input required value={dataForm.title||""} onChange={e=>setDataForm({...dataForm,title:e.target.value})}/></label><label>Event type<select value={dataForm.event_type||"note"} onChange={e=>setDataForm({...dataForm,event_type:e.target.value})}><option value="note">Family note</option><option value="appointment">Appointment</option><option value="test">Test</option><option value="mobility">Mobility change</option><option value="treatment">Treatment</option><option value="milestone">Milestone</option></select></label><label>Notes<textarea rows={4} value={dataForm.notes||""} onChange={e=>setDataForm({...dataForm,notes:e.target.value})}/></label></>}
          <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setQuickForm(null)}>Cancel</button><button type="submit">Save record</button></div>
        </form></div>}

        {showMemberModal && <div className="modal-backdrop"><form className="portal-modal family-modal" onSubmit={addFamilyMember}><div className="family-modal-heading"><div className="family-modal-icon"><UserRound/></div><div><h2>Add family member</h2><p>Add only information you are authorized to manage.</p></div></div><label>First name<input required value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})}/></label><label>Last name<input required value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})}/></label><label>Date of birth<input type="date" value={form.date_of_birth} onChange={e=>setForm({...form,date_of_birth:e.target.value})}/></label><label>Relationship<input value={form.relationship_to_family} onChange={e=>setForm({...form,relationship_to_family:e.target.value})} placeholder="Son, daughter, brother, self..."/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowMemberModal(false)}>Cancel</button><button type="submit">Save family member</button></div></form></div>}

        {showUploadModal && <div className="modal-backdrop"><form className="portal-modal family-modal" onSubmit={uploadDocument}><div className="family-modal-heading"><div className="family-modal-icon"><Upload/></div><div><h2>Upload medical record</h2><p>PDF, JPG or PNG. Maximum file size: 20 MB.</p></div></div><label>Family member<select required value={uploadPatientId} onChange={e=>setUploadPatientId(e.target.value)}><option value="">Select family member</option>{patients.map(p=><option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}</select></label><label className="family-file-field">Medical document<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>setUploadFile(e.target.files?.[0]||null)}/><span>{uploadFile ? uploadFile.name : "Choose a PDF, JPG or PNG file"}</span></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowUploadModal(false)}>Cancel</button><button type="submit" disabled={busy}>{busy ? "Uploading..." : "Upload securely"}</button></div></form></div>}
      </section>
    </main>
  );
}
