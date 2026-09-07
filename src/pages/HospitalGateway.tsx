import {useEffect,useState} from "react";
import {useNavigate} from "react-router-dom";
import {ArrowLeft,Building2,ShieldCheck,Stethoscope} from "lucide-react";
import {supabase} from "../lib/supabase";
import ClinicalPortal from "./ClinicalPortal";

type AccessState="loading"|"provider"|"family"|"applicant"|"guest"|"error";

type MembershipRow={
  membership_status?:string|null;
  organization_id?:string|null;
  organizations?:{verification_status?:string|null}|Array<{verification_status?:string|null}>|null;
};

export default function HospitalGateway(){
 const nav=useNavigate();
 const [state,setState]=useState<AccessState>("loading");
 const [message,setMessage]=useState("");

 const useProviderAccount=async()=>{
  await supabase.auth.signOut({scope:"local"});
  nav("/login?portal=clinical",{replace:true});
 };

 useEffect(()=>{void(async()=>{
  try{
   const {data:{user},error:userError}=await supabase.auth.getUser();
   if(userError)throw userError;
   if(!user){setState("guest");return;}

   // Fast path: an approved hospital account is normally promoted to hospital_member.
   const {data:profile,error:profileError}=await supabase
    .from("profiles")
    .select("account_type")
    .eq("id",user.id)
    .maybeSingle();
   if(profileError)console.warn("DMD-AI profile access check:",profileError.message);
   const role=(profile as {account_type?:string}|null)?.account_type||"";
   if(role==="admin"||role==="hospital_member"){setState("provider");return;}

   // Authoritative fallback: verify the signed-in user's active organization membership
   // and the organization's approval state. This prevents an approved hospital from
   // being blocked if profiles.account_type is stale or was not promoted correctly.
   const {data:memberships,error:membershipError}=await supabase
    .from("organization_members")
    .select("organization_id,membership_status,organizations(verification_status)")
    .eq("user_id",user.id)
    .eq("membership_status","active");

   if(membershipError){
    console.warn("DMD-AI organization membership access check:",membershipError.message);
   }else{
    const approved=(memberships as MembershipRow[]|null|undefined)?.some((m)=>{
     const org=Array.isArray(m.organizations)?m.organizations[0]:m.organizations;
     return m.membership_status==="active"&&org?.verification_status==="approved";
    });
    if(approved){setState("provider");return;}
   }

   if(role==="hospital_applicant"){setState("applicant");return;}
   setState("family");
  }catch(err){
   console.error("DMD-AI hospital access check failed:",err);
   setMessage(err instanceof Error?err.message:"Unable to verify hospital access.");
   setState("error");
  }
 })()},[]);

 if(state==="loading")return <div style={{padding:40,fontFamily:"Inter,system-ui"}}>Checking hospital access…</div>;
 if(state==="provider")return <ClinicalPortal/>;

 const applicant=state==="applicant";
 const isError=state==="error";
 return <main style={{minHeight:"100vh",background:"#f7f7fc",display:"grid",placeItems:"center",padding:24,fontFamily:"Inter,system-ui",color:"#241d38"}}>
  <section style={{maxWidth:620,background:"#fff",border:"1px solid #e9e4f2",borderRadius:24,padding:"38px",boxShadow:"0 18px 55px rgba(50,31,94,.08)"}}>
   <div style={{width:54,height:54,borderRadius:16,display:"grid",placeItems:"center",background:"#eee7ff",color:"#7043dc"}}><Building2/></div>
   <p style={{fontSize:12,fontWeight:900,letterSpacing:"1.3px",color:"#7043dc"}}>DMD-AI PROVIDER CONNECTION</p>
   <h1 style={{fontSize:30,margin:"8px 0"}}>{isError?"Unable to verify hospital access":applicant?"Hospital verification pending":"Hospital access required"}</h1>
   <p style={{color:"#716a7d",lineHeight:1.65}}>{isError?message:applicant?"Your hospital account must be approved before care requests can be reviewed.":"You are currently signed in with a Family account. Clinical access requires an approved hospital account. Use the button below to switch accounts."}</p>
   <div style={{display:"flex",gap:10,background:"#f5f1ff",padding:14,borderRadius:13,margin:"20px 0"}}><ShieldCheck style={{color:"#7043dc",flex:"0 0 auto"}}/><span style={{fontSize:13,lineHeight:1.5}}>DMD-AI connects consenting families with verified providers. It does not replace your hospital's existing EHR or hospital-management system.</span></div>
   <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
    {applicant?<button onClick={()=>nav("/hospital-application")} style={{border:0,borderRadius:10,padding:"11px 15px",background:"#7043dc",color:"#fff",fontWeight:800,cursor:"pointer"}}><Building2 size={17} style={{verticalAlign:"middle"}}/> View hospital application</button>
    :state==="family"?<button onClick={()=>void useProviderAccount()} style={{border:0,borderRadius:10,padding:"11px 15px",background:"#7043dc",color:"#fff",fontWeight:800,cursor:"pointer"}}><Stethoscope size={17} style={{verticalAlign:"middle"}}/> Sign in with hospital account</button>
    :<button onClick={()=>nav("/login?portal=clinical")} style={{border:0,borderRadius:10,padding:"11px 15px",background:"#7043dc",color:"#fff",fontWeight:800,cursor:"pointer"}}><Stethoscope size={17} style={{verticalAlign:"middle"}}/> Provider sign in</button>}
    <button onClick={()=>nav(state==="family"?"/family":"/")} style={{border:"1px solid #d9d0ee",borderRadius:10,padding:"11px 15px",background:"#fff",color:"#5e39bc",fontWeight:800,cursor:"pointer"}}><ArrowLeft size={17} style={{verticalAlign:"middle"}}/> {state==="family"?"Return to Family Portal":"Return home"}</button>
   </div>
  </section>
 </main>;
}
