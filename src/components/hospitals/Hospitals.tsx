import {
  Activity,
  ArrowRight,
  BrainCircuit,
  ClipboardList,
  Dna,
  FileText,
  HeartPulse,
  Microscope,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import clinicalImage from "../../assets/clinical-intelligence.png";
import "./Hospitals.css";

const capabilities = [
  {
    icon: FileText,
    title: "Clinical Reports",
    text: "Bring relevant clinical findings, laboratory results, and medical reports into one structured workspace.",
  },
  {
    icon: Dna,
    title: "Genetic Intelligence",
    text: "Review DMD-related genetic findings, variants, deletions, duplications, and other molecular evidence.",
  },
  {
    icon: BrainCircuit,
    title: "AI-Assisted Assessment",
    text: "Use explainable AI support to highlight patterns and information that may deserve closer clinical review.",
  },
  {
    icon: Activity,
    title: "Progression Monitoring",
    text: "Track important changes in mobility, respiratory health, cardiac assessments, and other longitudinal measures.",
  },
];

function Hospitals() {
  return (
    <section className="hospitals-section" id="hospitals">
      <div className="hospitals-container">
        <div className="hospitals-header">
          <div className="hospitals-kicker">
            <Stethoscope size={17} />
            <span>Healthcare Professionals</span>
          </div>

          <h2>
            Clinical Intelligence
            <br />
            for Better <span>DMD Care.</span>
          </h2>

          <p>
            DMD-AI is being designed to help clinicians bring together clinical,
            laboratory, genetic, and longitudinal information in one
            evidence-focused environment.
          </p>
        </div>

        <div className="hospitals-main">
          <div className="hospitals-content">
            <div className="hospitals-small-label">
              <ShieldCheck size={17} />
              CLINICIAN-CENTERED WORKFLOW
            </div>

            <h3>
              Bring fragmented DMD information into one clearer clinical view.
            </h3>

            <p className="hospitals-intro">
              Instead of switching between disconnected reports, genetic files,
              laboratory results, and patient histories, clinicians can review
              relevant DMD information through one structured workflow.
            </p>

            <div className="hospitals-capabilities">
              {capabilities.map((item) => {
                const Icon = item.icon;

                return (
                  <article className="hospital-capability-card" key={item.title}>
                    <div className="hospital-capability-icon">
                      <Icon size={23} />
                    </div>

                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.text}</p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hospitals-actions">
              <button className="hospitals-primary-btn" type="button">
                Explore Clinical Platform
                <ArrowRight size={19} />
              </button>

              <button className="hospitals-secondary-btn" type="button">
                <ClipboardList size={19} />
                Clinical Features
              </button>
            </div>

            <div className="hospitals-note">
              <Microscope size={19} />

              <p>
                DMD-AI is intended to support clinical workflows and
                interpretation. It does not replace specialist judgement,
                confirmatory testing, or established standards of care.
              </p>
            </div>
          </div>

          <div className="hospitals-visual">
            <div className="hospitals-image-glow" />

            <img
              src={clinicalImage}
              alt="Illustration of clinicians using AI-assisted DMD clinical intelligence"
            />

            <div className="hospitals-visual-card hospitals-visual-card-one">
              <BrainCircuit size={24} />

              <div>
                <strong>AI-Assisted Insights</strong>
                <span>Evidence made easier to review</span>
              </div>
            </div>

            <div className="hospitals-visual-card hospitals-visual-card-two">
              <HeartPulse size={24} />

              <div>
                <strong>Longitudinal Care</strong>
                <span>Track meaningful changes over time</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hospitals-trust-strip">
          <div>
            <ShieldCheck size={25} />

            <span>
              <strong>Privacy by Design</strong>
              <small>
                Patient information should be handled with strong security and
                access controls.
              </small>
            </span>
          </div>

          <div>
            <Dna size={25} />

            <span>
              <strong>Genomic Context</strong>
              <small>
                Bring relevant genetic findings into the clinical workflow.
              </small>
            </span>
          </div>

          <div>
            <BrainCircuit size={25} />

            <span>
              <strong>Explainable AI</strong>
              <small>
                Show clinicians the evidence behind important system outputs.
              </small>
            </span>
          </div>

          <div>
            <Stethoscope size={25} />

            <span>
              <strong>Clinician Review</strong>
              <small>
                Healthcare professionals remain responsible for clinical
                decisions.
              </small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hospitals;