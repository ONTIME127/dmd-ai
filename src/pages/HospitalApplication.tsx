import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  ArrowLeft, ArrowRight, Building2, CheckCircle2, ClipboardCheck,
  FileCheck2, FileText, Globe2, Hospital, Mail, MapPin, Phone,
  ShieldCheck, Stethoscope, Upload, User
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type HospitalForm = {
  hospitalName: string; facilityType: string; registrationNumber: string;
  country: string; state: string; city: string; address: string;
  website: string; hospitalPhone: string; representativeName: string;
  representativeRole: string; department: string; professionalLicense: string;
  workEmail: string;
};
type DocKey = "facility_registration" | "accreditation" | "authorization_letter";
type ExistingApplication = { id:string; organization_id:string; status:string; reviewer_notes:string|null; submitted_at:string|null; representative_name:string; representative_role:string; department:string|null; professional_license_number:string|null; work_email:string };

const initialForm: HospitalForm = {
  hospitalName:"", facilityType:"", registrationNumber:"", country:"", state:"", city:"",
  address:"", website:"", hospitalPhone:"", representativeName:"", representativeRole:"",
  department:"", professionalLicense:"", workEmail:""
};

function HospitalApplication(){
  const navigate=useNavigate();
  const [checkingAuth,setCheckingAuth]=useState(true);
  const [step,setStep]=useState(1);
  const [form,setForm]=useState<HospitalForm>(initialForm);
  const [docs,setDocs]=useState<Partial<Record<DocKey,File>>>({});
  const [existing,setExisting]=useState<ExistingApplication|null>(null);
  const [existingOrgName,setExistingOrgName]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [confirmed,setConfirmed]=useState(false);

  useEffect(()=>{ void (async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){navigate("/login");return;}
    setForm(v=>({...v,representativeName:user.user_metadata?.full_name??"",workEmail:user.email??""}));
    const {data:app}=await supabase.from("organization_verification_applications")
      .select("id, organization_id, status, reviewer_notes, submitted_at, representative_name, representative_role, department, professional_license_number, work_email")
      .eq("submitted_by",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(app){
      setExisting(app as ExistingApplication);
      const {data:org}=await supabase.from("organizations").select("*").eq("id",app.organization_id).maybeSingle();
      setExistingOrgName(org?.name??"");

      if(org){
        setForm(v=>({
          ...v,
          hospitalName:org.name??v.hospitalName,
          facilityType:org.facility_type??v.facilityType,
          registrationNumber:org.registration_number??v.registrationNumber,
          country:org.country??v.country,
          state:org.state_province??v.state,
          city:org.city??v.city,
          address:org.address??v.address,
          website:org.website??v.website,
          hospitalPhone:org.phone??v.hospitalPhone,
        }));
      }

      setForm(v=>({
        ...v,
        representativeName:app.representative_name??v.representativeName,
        representativeRole:app.representative_role??v.representativeRole,
        department:app.department??v.department,
        professionalLicense:app.professional_license_number??v.professionalLicense,
        workEmail:app.work_email??v.workEmail,
      }));

      if(app.status==="draft"||app.status==="needs_more_information") setStep(3);
    }
    setCheckingAuth(false);
  })();},[navigate]);

  const update=(field:keyof HospitalForm,value:string)=>setForm(v=>({...v,[field]:value}));
  const progress=useMemo(()=>step*25,[step]);
  const validateFile=(file:File)=>{
    if(!["application/pdf","image/jpeg","image/png"].includes(file.type)) return "Use PDF, JPG or PNG documents.";
    if(file.size>10*1024*1024) return "Each document must be 10 MB or smaller.";
    return "";
  };
  const pickDoc=(key:DocKey)=>(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0]; if(!file)return;
    const issue=validateFile(file); if(issue){setError(issue);event.target.value="";return;}
    setError(""); setDocs(v=>({...v,[key]:file}));
  };
  const validateStep=(n:number)=>{
    if(n===1){
      if(!form.hospitalName.trim())return "Enter the legal hospital or organization name.";
      if(!form.facilityType)return "Select the facility type.";
      if(!form.registrationNumber.trim())return "Enter the official registration or facility licence number.";
      if(!form.country.trim()||!form.city.trim()||!form.address.trim())return "Complete the country, city and official address.";
      if(!form.hospitalPhone.trim())return "Enter the hospital's official phone number.";
    }
    if(n===2){
      if(!form.representativeName.trim())return "Enter the authorized representative's name.";
      if(!form.representativeRole)return "Select the representative's professional role.";
      if(!form.workEmail.includes("@"))return "Enter a valid official work email.";
    }
    if(n===3 && !existing && !docs.facility_registration)return "Upload the hospital registration certificate or facility licence.";
    if(n===3 && existing?.status==="needs_more_information" && !docs.facility_registration)return "Upload the requested replacement facility registration or licence document.";
    return "";
  };
  const next=()=>{const issue=validateStep(step);if(issue){setError(issue);return;}setError("");setStep(v=>Math.min(4,v+1));window.scrollTo({top:0,behavior:"smooth"});};
  const back=()=>{setError("");setStep(v=>Math.max(1,v-1));window.scrollTo({top:0,behavior:"smooth"});};

  const uploadDocument=async(userId:string,organizationId:string,applicationId:string,key:DocKey,file:File)=>{
    const extension=file.name.split(".").pop()?.toLowerCase()??"file";
    const storagePath=`${userId}/${organizationId}/${crypto.randomUUID()}.${extension}`;
    const {error:uploadError}=await supabase.storage.from("hospital-verification").upload(storagePath,file,{cacheControl:"3600",upsert:false,contentType:file.type});
    if(uploadError)throw uploadError;
    const {error:metadataError}=await supabase.rpc("record_hospital_verification_document",{
      p_application_id:applicationId,p_organization_id:organizationId,p_storage_path:storagePath,
      p_original_filename:file.name,p_mime_type:file.type,p_file_size_bytes:file.size,p_document_type:key
    });
    if(metadataError){await supabase.storage.from("hospital-verification").remove([storagePath]);throw metadataError;}
  };

  const submit=async()=>{
    if(!confirmed){setError("Confirm that you are authorized and the submitted information is accurate.");return;}
    setError("");setLoading(true);
    try{
      const {data:{user}}=await supabase.auth.getUser(); if(!user)throw new Error("Your session expired. Please log in again.");
      let applicationId=existing?.id; let organizationId=existing?.organization_id;
      if(!applicationId||!organizationId){
        for(const n of [1,2,3]){const issue=validateStep(n);if(issue)throw new Error(issue);}
        const {data,error:rpcError}=await supabase.rpc("submit_hospital_application",{
          p_hospital_name:form.hospitalName,p_facility_type:form.facilityType,p_registration_number:form.registrationNumber,
          p_country:form.country,p_state_province:form.state||null,p_city:form.city,p_address:form.address,
          p_website:form.website||null,p_phone:form.hospitalPhone,p_representative_name:form.representativeName,
          p_representative_role:form.representativeRole,p_department:form.department||null,
          p_professional_license_number:form.professionalLicense||null,p_work_email:form.workEmail
        });
        if(rpcError)throw rpcError; applicationId=data?.application_id; organizationId=data?.organization_id;
        if(!applicationId||!organizationId)throw new Error("The verification application could not be created.");
      }
      for(const [key,file] of Object.entries(docs) as [DocKey,File][]){await uploadDocument(user.id,organizationId,applicationId,key,file);}
      const {error:finalizeError}=await supabase.rpc("finalize_hospital_application",{p_application_id:applicationId});
      if(finalizeError)throw finalizeError;
      setExisting({id:applicationId,organization_id:organizationId,status:"pending",reviewer_notes:null,submitted_at:new Date().toISOString(),representative_name:form.representativeName,representative_role:form.representativeRole,department:form.department||null,professional_license_number:form.professionalLicense||null,work_email:form.workEmail});
      setExistingOrgName(form.hospitalName||existingOrgName);setSuccess("Your organization has been submitted for verification. Clinical access remains locked until DMD-AI administrators complete the review.");
      window.scrollTo({top:0,behavior:"smooth"});
    }catch(err){setError(err instanceof Error?err.message:"Unable to submit the organization for verification.");}
    finally{setLoading(false);}
  };

  if(checkingAuth)return <main className="hospital-application-loading"><div><ShieldCheck size={35}/><strong>Checking secure session...</strong></div></main>;
  if(existing && !["draft","needs_more_information"].includes(existing.status)){
    const statusLabel=existing.status.replaceAll("_"," ");
    return <main className="hospital-application-page"><header className="hospital-application-header"><button onClick={()=>navigate("/")}><ArrowLeft size={20}/>DMD-AI</button><div><ShieldCheck size={20}/>Organization Verification</div></header>
      <div className="hospital-application-container hospital-status-container"><section className="hospital-status-card"><div className="hospital-status-icon"><ClipboardCheck size={34}/></div><span>APPLICATION STATUS</span><h1>{existingOrgName||"Healthcare organization"}</h1><div className={`hospital-status-pill status-${existing.status}`}>{statusLabel}</div><p>{existing.status==="approved"?"Your organization has been approved. You can now continue to the Clinical Portal.":existing.status==="rejected"?"Your application was not approved. Review the information below for the reason and next steps.":"Your application is under review. We'll notify you when the review is complete. Clinical features become available after your organization is approved."}</p>{existing.reviewer_notes&&<div className="hospital-review-note"><strong>Reviewer note</strong><p>{existing.reviewer_notes}</p></div>}<button className="auth-submit-button" onClick={()=>navigate(existing.status==="approved"?"/hospital":"/")}>{existing.status==="approved"?"Continue to Hospital Portal":"Return to DMD-AI"}</button></section></div></main>;
  }

  return <main className="hospital-application-page">
    <header className="hospital-application-header"><button onClick={()=>navigate("/")}><ArrowLeft size={20}/>DMD-AI</button><div><ShieldCheck size={20}/>Secure Organization Verification</div></header>
    <div className="hospital-application-container hospital-wizard-container">
      <div className="hospital-application-heading"><span>CLINICAL ORGANIZATION ONBOARDING</span><h1>Verify Your Healthcare Organization</h1><p>Institutional access is granted only after organization details and supporting evidence are reviewed.</p></div>
      {existing?.status==="needs_more_information"&&<div className="hospital-more-info"><strong>More information requested</strong><p>{existing.reviewer_notes||"Please provide the requested evidence and resubmit your application."}</p></div>}
      <div className="hospital-wizard-progress"><div className="hospital-progress-top"><strong>Step {step} of 4</strong><span>{step===1?"Organization":step===2?"Representative":step===3?"Verification documents":"Review & submit"}</span></div><div className="hospital-progress-track"><i style={{width:`${progress}%`}}/></div><div className="hospital-step-dots">{[1,2,3,4].map(n=><button key={n} type="button" className={n===step?"active":n<step?"complete":""} onClick={()=>n<step&&setStep(n)}>{n<step?<CheckCircle2 size={17}/>:n}</button>)}</div></div>
      {error&&<div className="auth-error hospital-message">{error}</div>}{success&&<div className="auth-success hospital-message">{success}</div>}

      {step===1&&<section className="hospital-form-section hospital-wizard-card"><div className="hospital-section-heading"><Building2 size={23}/><div><span>STEP 1</span><h3>Healthcare Organization</h3><p>Enter the institution's legal and publicly verifiable details.</p></div></div><div className="hospital-form-grid">
        <label className="hospital-field-wide">Legal Hospital / Organization Name<div className="auth-input-wrap"><Hospital size={20}/><input value={form.hospitalName} onChange={e=>update("hospitalName",e.target.value)} placeholder="Official registered name"/></div></label>
        <label>Facility Type<div className="auth-select-wrap"><Building2 size={20}/><select value={form.facilityType} onChange={e=>update("facilityType",e.target.value)}><option value="">Select facility type</option><option value="hospital">Hospital</option><option value="specialist_hospital">Specialist Hospital</option><option value="teaching_hospital">Teaching / Research Hospital</option><option value="neuromuscular_center">Neuromuscular Center</option><option value="clinic">Clinic</option><option value="diagnostic_center">Diagnostic Center</option><option value="other">Other</option></select></div></label>
        <label>Registration / Facility Licence No.<div className="auth-input-wrap"><FileCheck2 size={20}/><input value={form.registrationNumber} onChange={e=>update("registrationNumber",e.target.value)} placeholder="Government / regulator number"/></div></label>
        <label>Country<div className="auth-input-wrap"><Globe2 size={20}/><input value={form.country} onChange={e=>update("country",e.target.value)} placeholder="Country"/></div></label>
        <label>State / Province<div className="auth-input-wrap"><MapPin size={20}/><input value={form.state} onChange={e=>update("state",e.target.value)} placeholder="State / Province"/></div></label>
        <label>City<div className="auth-input-wrap"><MapPin size={20}/><input value={form.city} onChange={e=>update("city",e.target.value)} placeholder="City"/></div></label>
        <label>Official Phone<div className="auth-input-wrap"><Phone size={20}/><input value={form.hospitalPhone} onChange={e=>update("hospitalPhone",e.target.value)} placeholder="Hospital phone number"/></div></label>
        <label className="hospital-field-wide">Official Address<div className="auth-input-wrap"><MapPin size={20}/><input value={form.address} onChange={e=>update("address",e.target.value)} placeholder="Full registered facility address"/></div></label>
        <label className="hospital-field-wide">Official Website <small className="field-optional">Optional</small><div className="auth-input-wrap"><Globe2 size={20}/><input type="url" value={form.website} onChange={e=>update("website",e.target.value)} placeholder="https://hospital.org"/></div></label>
      </div></section>}

      {step===2&&<section className="hospital-form-section hospital-wizard-card"><div className="hospital-section-heading"><Stethoscope size={23}/><div><span>STEP 2</span><h3>Authorized Representative</h3><p>Identify the person responsible for this institutional application.</p></div></div><div className="hospital-form-grid">
        <label className="hospital-field-wide">Full Name<div className="auth-input-wrap"><User size={20}/><input value={form.representativeName} onChange={e=>update("representativeName",e.target.value)}/></div></label>
        <label>Professional Role<div className="auth-select-wrap"><Stethoscope size={20}/><select value={form.representativeRole} onChange={e=>update("representativeRole",e.target.value)}><option value="">Select role</option><option value="medical_director">Medical Director</option><option value="neurologist">Neurologist</option><option value="pediatrician">Pediatrician</option><option value="clinical_geneticist">Clinical Geneticist</option><option value="administrator">Hospital Administrator</option><option value="researcher">Researcher</option><option value="other">Other Authorized Representative</option></select></div></label>
        <label>Department<div className="auth-input-wrap"><Building2 size={20}/><input value={form.department} onChange={e=>update("department",e.target.value)} placeholder="Neurology, Pediatrics, Administration..."/></div></label>
        <label>Professional Licence No. <small className="field-optional">If applicable</small><div className="auth-input-wrap"><FileCheck2 size={20}/><input value={form.professionalLicense} onChange={e=>update("professionalLicense",e.target.value)} placeholder="Professional registration number"/></div></label>
        <label>Official Work Email<div className="auth-input-wrap"><Mail size={20}/><input type="email" value={form.workEmail} onChange={e=>update("workEmail",e.target.value)} placeholder="name@hospital.org"/></div></label>
      </div></section>}

      {step===3&&<section className="hospital-form-section hospital-wizard-card"><div className="hospital-section-heading"><FileText size={23}/><div><span>STEP 3</span><h3>Verification Evidence</h3><p>Upload the organization documents required for verification.</p></div></div><div className="hospital-document-grid">
        <DocumentUpload title="Facility registration / licence" description="Required for a new application. Upload the current registration certificate, facility licence, or equivalent regulator-issued evidence." required file={docs.facility_registration} onChange={pickDoc("facility_registration")}/>
        <DocumentUpload title="Accreditation / regulatory evidence" description="Optional supporting evidence from an accrediting body, ministry, regulator or health authority." file={docs.accreditation} onChange={pickDoc("accreditation")}/>
        <DocumentUpload title="Representative authorization" description="Optional letter or document showing that the representative is authorized to act for the institution." file={docs.authorization_letter} onChange={pickDoc("authorization_letter")}/>
      </div><div className="hospital-security-note"><ShieldCheck size={21}/><div><strong>Document privacy</strong><p>Verification documents are securely protected and accessible only to authorized reviewers.</p></div></div></section>}

      {step===4&&<section className="hospital-form-section hospital-wizard-card"><div className="hospital-section-heading"><ClipboardCheck size={23}/><div><span>STEP 4</span><h3>Review & Submit</h3><p>Review the organization and representative information before sending it for verification.</p></div></div>
        <div className="hospital-review-grid"><ReviewBlock title="Organization" rows={[["Name",form.hospitalName],["Facility type",form.facilityType.replaceAll("_"," ")],["Registration / licence",form.registrationNumber],["Location",[form.city,form.state,form.country].filter(Boolean).join(", ")],["Phone",form.hospitalPhone],["Website",form.website||"Not provided"]]}/><ReviewBlock title="Representative" rows={[["Name",form.representativeName],["Role",form.representativeRole.replaceAll("_"," ")],["Department",form.department||"Not provided"],["Professional licence",form.professionalLicense||"Not provided"],["Work email",form.workEmail]]}/></div>
        <div className="hospital-review-docs"><strong>Documents selected</strong>{Object.keys(docs).length?Object.entries(docs).map(([k,f])=><div key={k}><FileCheck2 size={18}/><span>{f?.name}</span></div>):<p>{existing?"Existing verification evidence is already attached to this application.":"No documents selected."}</p>}</div>
        <label className="hospital-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I confirm that I am authorized to submit this application on behalf of the organization and that the information and documents supplied are accurate and authentic.</span></label>
      </section>}

      <div className="hospital-wizard-actions">{step>1?<button type="button" className="hospital-secondary-button" onClick={back}><ArrowLeft size={18}/>Back</button>:<span/>}{step<4?<button type="button" className="auth-submit-button hospital-next-button" onClick={next}>Continue<ArrowRight size={18}/></button>:<button type="button" className="auth-submit-button hospital-next-button" onClick={submit} disabled={loading||Boolean(success)}><ShieldCheck size={19}/>{loading?"Submitting securely...":"Submit for verification"}</button>}</div>
    </div>
  </main>;
}

function DocumentUpload({title,description,required=false,file,onChange}:{title:string;description:string;required?:boolean;file?:File;onChange:(e:ChangeEvent<HTMLInputElement>)=>void}){
  return <label className={`hospital-doc-upload ${file?"has-file":""}`}><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onChange}/><div className="hospital-doc-icon">{file?<CheckCircle2 size={26}/>:<Upload size={26}/>}</div><div><strong>{title}{required&&<em>Required</em>}</strong><p>{file?file.name:description}</p><small>{file?`${(file.size/1024/1024).toFixed(2)} MB`:`PDF, JPG or PNG • max 10 MB`}</small></div></label>;
}
function ReviewBlock({title,rows}:{title:string;rows:[string,string][]}){return <div className="hospital-review-block"><h4>{title}</h4>{rows.map(([k,v])=><div key={k}><span>{k}</span><strong>{v||"—"}</strong></div>)}</div>}
export default HospitalApplication;
