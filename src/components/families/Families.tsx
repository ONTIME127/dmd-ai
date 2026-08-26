import {
  BookOpen,
  Heart,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
  Users,
  HandHeart,
  Star,
} from "lucide-react";

import familiesImage from "../../assets/families.png";
import "./Families.css";

const leftCards = [
  {
    icon: Users,
    title: "You're Not Alone",
    text: "Support and guidance for families navigating DMD.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted & Secure",
    text: "Your information and privacy are treated with care.",
  },
  {
    icon: BookOpen,
    title: "Learn & Understand",
    text: "Clear explanations about DMD, genetics, testing, and care.",
  },
];

const rightCards = [
  {
    icon: HandHeart,
    title: "Care & Guidance",
    text: "Practical support for daily care, mobility, and wellbeing.",
  },
  {
    icon: MessageCircleHeart,
    title: "Community Support",
    text: "Connect with resources, support networks, and other families.",
  },
  {
    icon: Star,
    title: "Hope & Strength",
    text: "Helping families stay informed, prepared, and supported.",
  },
];

function Families() {
  return (
    <section className="families-section" id="families">
      <div className="families-container">
        <div className="families-header">
          <div className="families-kicker">
            <Heart size={16} />
            <span>Families & Caregivers</span>
          </div>

          <h2>
            Support for Every Step
            <br />
            of the <span>Journey.</span>
          </h2>

          <p>
            DMD affects the whole family. DMD-AI is designed to help families
            understand complex information, organize care, and find reliable
            support throughout the journey.
          </p>
        </div>

        <div className="families-visual-stage">
          <img
            src={familiesImage}
            alt="Family supporting a child who uses a wheelchair"
            className="families-main-image"
          />

          <div className="families-side-column families-left-column">
            {leftCards.map((item) => {
              const Icon = item.icon;

              return (
                <article className="families-floating-card" key={item.title}>
                  <div className="families-floating-icon">
                    <Icon size={23} />
                  </div>

                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="families-side-column families-right-column">
            {rightCards.map((item) => {
              const Icon = item.icon;

              return (
                <article className="families-floating-card" key={item.title}>
                  <div className="families-floating-icon">
                    <Icon size={23} />
                  </div>

                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="families-promise-card">
            <div className="families-promise-icon">
              <Heart size={24} fill="currentColor" />
            </div>

            <span>Our Promise</span>

            <strong>
              Empathy. Support. Understanding.
              <br />
              We walk with you.
            </strong>
          </div>
        </div>

        <div className="families-bottom">
          <div className="families-bottom-copy">
            <div className="families-small-label">
              <Sparkles size={15} />
              FAMILY-CENTERED SUPPORT
            </div>

            <h3>Helping families understand what comes next.</h3>

            <p>
              The family portal will bring reports, care information, genetic
              insights, appointments, treatment resources, and support tools
              into one easier-to-understand experience.
            </p>
          </div>

          <div className="families-bottom-actions">
            <button className="families-primary-btn" type="button">
              Explore Family Support
            </button>

            <button className="families-secondary-btn" type="button">
              Family Resources
            </button>
          </div>
        </div>

        <p className="families-disclaimer">
          DMD-AI provides educational and decision-support information and does
          not replace diagnosis, genetic counselling, or professional medical
          care.
        </p>
      </div>
    </section>
  );
}

export default Families;