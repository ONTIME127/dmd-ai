import {
  Activity,
  Dna,
  HeartPulse,
  Microscope,
  ShieldCheck,
} from "lucide-react";

import aboutDmdImage from "../../assets/about-dmd.png";
import "./AboutDmd.css";

const facts = [
  {
    icon: Dna,
    title: "Genetic Cause",
    text: "DMD is caused by pathogenic changes in the DMD gene, which affect production of dystrophin.",
  },
  {
    icon: Activity,
    title: "Early Signs",
    text: "Possible signs include delayed motor milestones, frequent falls, difficulty climbing stairs, and progressive muscle weakness.",
  },
  {
    icon: Microscope,
    title: "Diagnosis",
    text: "Clinical assessment, CK testing, and molecular genetic testing are important parts of the diagnostic pathway.",
  },
  {
    icon: HeartPulse,
    title: "Progression",
    text: "DMD is progressive and can affect skeletal muscle, mobility, respiratory function, and cardiac health over time.",
  },
];

function AboutDmd() {
  return (
    <section className="about-dmd-section" id="about">
      <div className="about-dmd-container">
        <div className="about-dmd-heading">
          <div className="about-dmd-kicker">
            <ShieldCheck size={16} />
            <span>Understanding DMD</span>
          </div>

          <h2>
            Understanding Duchenne
            <br />
            Muscular Dystrophy
          </h2>

          <p>
            Duchenne muscular dystrophy is a rare genetic neuromuscular
            disorder caused by changes in the DMD gene. These changes reduce or
            prevent production of dystrophin, a protein that helps protect
            muscle fibers during movement.
          </p>
        </div>

        <div className="about-dmd-main">
          <div className="about-dmd-visual">
            <img
              src={aboutDmdImage}
              alt="Illustration showing the DMD gene, dystrophin, and muscle changes in Duchenne muscular dystrophy"
            />
          </div>

          <div className="about-dmd-copy">
            <div className="about-dmd-copy-block">
              <span className="about-copy-label">Why dystrophin matters</span>

              <h3>
                Dystrophin helps keep muscle fibers stable during movement.
              </h3>

              <p>
                When dystrophin is absent or severely reduced, muscle fibers
                become more vulnerable to damage. Over time, repeated injury
                contributes to progressive muscle weakness.
              </p>
            </div>

            <div className="about-dmd-highlight">
              <div className="highlight-icon">
                <Dna size={25} />
              </div>

              <div>
                <strong>DMD is X-linked.</strong>
                <p>
                  The DMD gene is located on the X chromosome, which is why the
                  condition primarily affects boys, although females can also
                  carry pathogenic variants and may sometimes have symptoms.
                </p>
              </div>
            </div>

            <div className="about-dmd-note">
              <strong>Important:</strong>
              <span>
                AI can support screening and interpretation, but it does not
                replace specialist evaluation or confirmatory genetic testing.
              </span>
            </div>
          </div>
        </div>

        <div className="about-dmd-facts">
          {facts.map((fact) => {
            const Icon = fact.icon;

            return (
              <article className="about-fact-card" key={fact.title}>
                <div className="about-fact-icon">
                  <Icon size={24} />
                </div>

                <div>
                  <h3>{fact.title}</h3>
                  <p>{fact.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default AboutDmd;