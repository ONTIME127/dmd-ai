import {
  ArrowRight,
  BarChart3,
  Beaker,
  BrainCircuit,
  Database,
  Dna,
  FlaskConical,
  Globe2,
  Microscope,
  Network,
  ShieldCheck,
} from "lucide-react";

import researchImage from "../../assets/research.png";
import "./Research.css";

const researchAreas = [
  {
    icon: Dna,
    title: "Genomics & Molecular Research",
    text: "Explore DMD-related genetic variants and molecular evidence to support deeper understanding of disease mechanisms.",
  },
  {
    icon: BarChart3,
    title: "Biomarkers & Outcomes",
    text: "Study measurable biological and clinical signals that may help researchers understand progression and treatment response.",
  },
  {
    icon: FlaskConical,
    title: "Therapeutic Research",
    text: "Support responsible investigation of emerging approaches including gene-based, molecular, and other DMD therapies.",
  },
  {
    icon: Database,
    title: "Real-World Evidence",
    text: "Structure longitudinal information so researchers can investigate patterns across disease progression and care.",
  },
];

function Research() {
  return (
    <section className="research-section" id="research">
      <div className="research-container">

        <div className="research-header">
          <div className="research-kicker">
            <Microscope size={17} />
            <span>Research & Collaboration</span>
          </div>

          <h2>
            Advancing DMD Research.
            <br />
            <span>Together.</span>
          </h2>

          <p>
            DMD-AI is being designed to support responsible research by helping
            researchers organize complex information, investigate patterns,
            collaborate across disciplines, and turn evidence into meaningful
            questions for future discovery.
          </p>
        </div>

        <div className="research-main">

          <div className="research-visual">
            <img
              src={researchImage}
              alt="Scientific DMD research environment with DNA, laboratory equipment and global collaboration"
            />

            <div className="research-visual-badge research-badge-one">
              <Dna size={24} />

              <div>
                <strong>Genomic Research</strong>
                <span>Explore molecular evidence</span>
              </div>
            </div>

            <div className="research-visual-badge research-badge-two">
              <Globe2 size={24} />

              <div>
                <strong>Global Collaboration</strong>
                <span>Connect research knowledge</span>
              </div>
            </div>
          </div>

          <div className="research-content">

            <div className="research-small-label">
              <BrainCircuit size={17} />
              RESEARCH INTELLIGENCE
            </div>

            <h3>
              Turn complex DMD data into research-ready knowledge.
            </h3>

            <p className="research-intro">
              DMD research involves genetics, biomarkers, clinical outcomes,
              therapies, progression data, and scientific literature. Our
              research environment will help bring these sources together while
              preserving scientific oversight and responsible data use.
            </p>

            <div className="research-points">

              <div className="research-point">
                <div className="research-point-icon">
                  <Database size={23} />
                </div>

                <div>
                  <h4>Structured Research Data</h4>
                  <p>
                    Organize relevant clinical, genomic, and longitudinal
                    information for analysis.
                  </p>
                </div>
              </div>

              <div className="research-point">
                <div className="research-point-icon">
                  <BrainCircuit size={23} />
                </div>

                <div>
                  <h4>AI-Assisted Discovery</h4>
                  <p>
                    Use computational methods to identify patterns and generate
                    research hypotheses for expert investigation.
                  </p>
                </div>
              </div>

              <div className="research-point">
                <div className="research-point-icon">
                  <Network size={23} />
                </div>

                <div>
                  <h4>Collaborative Research</h4>
                  <p>
                    Create pathways for clinicians, researchers, laboratories,
                    and institutions to work together responsibly.
                  </p>
                </div>
              </div>

            </div>

            <div className="research-actions">
              <button className="research-primary-btn" type="button">
                Explore Research
                <ArrowRight size={19} />
              </button>

              <button className="research-secondary-btn" type="button">
                <Beaker size={19} />
                Research Areas
              </button>
            </div>

            <div className="research-note">
              <ShieldCheck size={20} />

              <p>
                Research features should use appropriately governed,
                consented, de-identified, or otherwise lawfully processed data
                according to applicable ethical and regulatory requirements.
              </p>
            </div>

          </div>
        </div>

        <div className="research-areas">
          {researchAreas.map((area) => {
            const Icon = area.icon;

            return (
              <article className="research-area-card" key={area.title}>
                <div className="research-area-icon">
                  <Icon size={25} />
                </div>

                <h3>{area.title}</h3>

                <p>{area.text}</p>

                <button
                  className="research-area-link"
                  type="button"
                  aria-label={`Learn more about ${area.title}`}
                >
                  Learn more
                  <ArrowRight size={17} />
                </button>
              </article>
            );
          })}
        </div>

        <div className="research-collaboration">
          <div className="research-collaboration-icon">
            <Globe2 size={31} />
          </div>

          <div className="research-collaboration-copy">
            <span>COLLABORATION</span>

            <h3>Better research happens when knowledge connects.</h3>

            <p>
              Our long-term vision is to support responsible collaboration
              between DMD researchers, clinicians, laboratories, universities,
              patient communities, and research institutions.
            </p>
          </div>

          <button className="research-collaboration-btn" type="button">
            Research Partnerships
            <ArrowRight size={19} />
          </button>
        </div>

      </div>
    </section>
  );
}

export default Research;