import {
  Activity,
  ArrowRight,
  BrainCircuit,
  ClipboardCheck,
  Database,
  Microscope,
  ShieldCheck,
} from "lucide-react";

import "./HowItWorks.css";

const steps = [
  {
    number: "01",
    icon: Database,
    title: "Collect",
    text: "Clinical details, symptoms, laboratory values, genetic findings, and uploaded medical reports are brought into one secure workflow.",
  },
  {
    number: "02",
    icon: Microscope,
    title: "Analyze",
    text: "The system structures clinical, laboratory, and genomic information so relevant DMD patterns can be examined together.",
  },
  {
    number: "03",
    icon: BrainCircuit,
    title: "Interpret",
    text: "AI-assisted models and evidence layers help identify important patterns, risks, abnormalities, and findings that deserve attention.",
  },
  {
    number: "04",
    icon: ClipboardCheck,
    title: "Review",
    text: "Clinicians review the extracted evidence, verify source information, and determine the appropriate diagnostic or care pathway.",
  },
  {
    number: "05",
    icon: Activity,
    title: "Advance",
    text: "Validated insights can support earlier referral, ongoing care, family understanding, treatment exploration, and responsible research.",
  },
];

function HowItWorks() {
  return (
    <section className="how-it-works-section" id="how-it-works">
      <div className="how-it-works-container">
        <div className="how-it-works-heading">
          <div className="how-it-works-kicker">
            <ShieldCheck size={16} />
            <span>How DMD-AI Works</span>
          </div>

          <h2>
            Powerful Technology.
            <br />
            Meaningful Clinical Support.
          </h2>

          <p>
            DMD-AI is designed to bring fragmented clinical, laboratory, and
            genetic information together into a structured workflow that
            supports healthcare professionals without replacing clinical
            judgement.
          </p>
        </div>

        <div className="workflow-shell">
          <div className="workflow-line" />

          <div className="workflow-grid">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <article className="workflow-step" key={step.number}>
                  <div className="workflow-top">
                    <span className="workflow-number">{step.number}</span>

                    <div className="workflow-icon">
                      <Icon size={22} />
                    </div>
                  </div>

                  <h3>{step.title}</h3>

                  <p>{step.text}</p>

                  {index < steps.length - 1 && (
                    <div className="workflow-arrow" aria-hidden="true">
                      <ArrowRight size={19} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>

        <div className="workflow-bottom">
          <div className="workflow-bottom-icon">
            <BrainCircuit size={25} />
          </div>

          <div>
            <span>Human-in-the-loop by design</span>
            <strong>
              AI supports interpretation. Healthcare professionals remain in
              control of clinical decisions.
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;