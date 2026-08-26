import {
  ArrowRight,
  BrainCircuit,
  Dna,
  FileSearch,
  HeartPulse,
  Microscope,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TestTubeDiagonal,
  Users,
} from "lucide-react";

import heroImage from "../../assets/hero.png";
import "./Hero.css";

const intelligenceCards = [
  {
    icon: HeartPulse,
    title: "Early Detection",
    description: "Identify potential DMD risk patterns earlier.",
  },
  {
    icon: Stethoscope,
    title: "Precision Care",
    description: "Support better-informed clinical decisions.",
  },
  {
    icon: Dna,
    title: "Genetic Intelligence",
    description: "Understand DMD-related genetic findings.",
  },
  {
    icon: FileSearch,
    title: "Report Analysis",
    description: "Extract relevant information from medical reports.",
  },
  {
    icon: BrainCircuit,
    title: "AI Risk Assessment",
    description: "Combine clinical evidence into explainable insights.",
  },
  {
    icon: TestTubeDiagonal,
    title: "Laboratory Insights",
    description: "Connect laboratory findings with patient information.",
  },
  {
    icon: Microscope,
    title: "Advancing Research",
    description: "Support responsible DMD research and discovery.",
  },
];

function Hero() {
  const scrollingCards = [...intelligenceCards, ...intelligenceCards];

  return (
    <section className="hero-section" id="home">
      <img
        src={heroImage}
        alt=""
        aria-hidden="true"
        className="hero-background-image"
      />

      <div className="hero-overlay" />

      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <Sparkles size={16} />
            <span>AI-Powered DMD Intelligence</span>
          </div>

          <h1>
            AI-Powered Intelligence
            <br />
            for a Stronger Future
            <br />
            Against <span>DMD</span>
          </h1>

          <p className="hero-description">
            Empowering clinicians, families, and researchers with AI-driven
            insights to improve care, accelerate research, and transform lives.
          </p>

          <div className="hero-actions">
            <button className="hero-action-card" type="button">
              <div className="hero-action-icon">
                <Stethoscope size={25} />
              </div>

              <div className="hero-action-copy">
                <strong>Healthcare Professionals</strong>
                <span>Access Clinical Platform</span>
              </div>

              <ArrowRight size={22} />
            </button>

            <button className="hero-action-card" type="button">
              <div className="hero-action-icon">
                <Users size={26} />
              </div>

              <div className="hero-action-copy">
                <strong>Families & Caregivers</strong>
                <span>Explore Family Support</span>
              </div>

              <ArrowRight size={22} />
            </button>
          </div>

          <div className="hero-trust-row">
            <div>
              <ShieldCheck size={18} />
              <span>Secure & Private</span>
            </div>

            <div>
              <ShieldCheck size={18} />
              <span>Evidence Based</span>
            </div>

            <div>
              <BrainCircuit size={18} />
              <span>AI-Assisted Insights</span>
            </div>
          </div>
        </div>

        <div className="hero-card-zone">
          <div className="hero-card-window">
            <div className="hero-card-fade hero-card-fade-top" />
            <div className="hero-card-fade hero-card-fade-bottom" />

            <div className="hero-card-track">
              {scrollingCards.map((item, index) => {
                const Icon = item.icon;

                return (
                  <article
                    className="hero-floating-card"
                    key={`${item.title}-${index}`}
                  >
                    <div className="hero-floating-icon">
                      <Icon size={19} />
                    </div>

                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;