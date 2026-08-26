import { useCallback, useEffect, useState } from "react";
import { UserRound, Users, X, ShieldCheck, ArrowRight } from "lucide-react";
import {
  assignAssessmentToFamilyMember,
  autoAssignUnassignedWhenSingleMember,
  getFamilyMembersForCurrentUser,
  getUnassignedAssessments,
  type FamilyMemberOption,
  type UnassignedAssessment,
} from "../lib/familyAssessment";
import "../styles/assessmentAssignmentGate.css";

export default function AssessmentAssignmentGate(){
  const [members,setMembers]=useState<FamilyMemberOption[]>([]);
  const [rows,setRows]=useState<UnassignedAssessment[]>([]);
  const [busy,setBusy]=useState(false);
  const [hidden,setHidden]=useState(false);
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    try{
      setError("");
      await autoAssignUnassignedWhenSingleMember();
      const [memberRows,assessmentRows]=await Promise.all([
        getFamilyMembersForCurrentUser(),
        getUnassignedAssessments(),
      ]);
      setMembers(memberRows);
      setRows(assessmentRows);
      if(assessmentRows.length===0)setHidden(false);
    }catch(e){
      setError(e instanceof Error?e.message:"Unable to prepare assessment assignment.");
    }
  },[]);

  useEffect(()=>{
    void load();
    const h=()=>void load();
    window.addEventListener("dmd-assessment-synced",h);
    return()=>window.removeEventListener("dmd-assessment-synced",h);
  },[load]);

  const assign=async(assessmentId:string,memberId:string)=>{
    setBusy(true);setError("");
    try{
      await assignAssessmentToFamilyMember(assessmentId,memberId);
      await load();
    }catch(e){
      setError(e instanceof Error?e.message:"Unable to assign this assessment.");
    }finally{setBusy(false)}
  };

  if(hidden||rows.length===0||members.length<=1)return null;

  const current=rows[0];
  return <div className="aag-backdrop" role="dialog" aria-modal="true" aria-label="Choose who this assessment is about">
    <section className="aag-modal">
      <button className="aag-close" onClick={()=>setHidden(true)} aria-label="Close"><X/></button>
      <div className="aag-icon"><Users/></div>
      <span className="aag-kicker">KEEP EACH PERSON'S HISTORY ACCURATE</span>
      <h2>Who is this assessment about?</h2>
      <p className="aag-intro">Choose the family member whose symptoms and changes were described. This keeps assessments, progression, records and reports attached to the correct person.</p>

      <div className="aag-assessment">
        <ShieldCheck/>
        <div><strong>{current.result_title}</strong><span>{new Date(current.occurred_at).toLocaleString()}</span></div>
      </div>

      <div className="aag-members">
        {members.map(member=><button key={member.id} disabled={busy} onClick={()=>void assign(current.id,member.id)}>
          <span className="aag-avatar"><UserRound/></span>
          <span className="aag-copy"><strong>{member.first_name} {member.last_name}</strong><small>{member.relationship_to_family||"Family member"}{member.date_of_birth?` · Born ${new Date(member.date_of_birth).toLocaleDateString()}`:""}</small></span>
          <ArrowRight/>
        </button>)}
      </div>

      {rows.length>1&&<p className="aag-remaining">{rows.length-1} more unassigned assessment{rows.length-1===1?"":"s"} will follow.</p>}
      {error&&<p className="aag-error">{error}</p>}
      <small className="aag-note">DMD-AI will never guess between multiple family members.</small>
    </section>
  </div>;
}
