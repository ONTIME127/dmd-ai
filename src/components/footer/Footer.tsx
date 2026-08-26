import {
  ArrowRight,
  Dna,
  Heart,
  Mail,
  ShieldCheck,
} from "lucide-react";

import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-container footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="footer-logo-icon">
                <Dna size={28} />
              </div>

              <div>
                <strong>DMD-AI</strong>
                <span>Clinical & Genomic Intelligence</span>
              </div>
            </div>

            <p>
              Building intelligent tools to support earlier recognition,
              clearer understanding, better-informed care, and responsible DMD
              research.
            </p>

            <div className="footer-mission">
              <Heart size={18} />

              <span>
                Built with families, clinicians, and the DMD community in mind.
              </span>
            </div>
          </div>

          <div className="footer-column">
            <h3>Platform</h3>

            <a href="#home">Home</a>
            <a href="#about">About DMD</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#families">Families & Caregivers</a>
            <a href="#hospitals">Healthcare Professionals</a>
            <a href="#research">Research</a>
            <a href="#resources">Resources</a>
          </div>

          <div className="footer-column">
            <h3>For Families</h3>

            <button type="button">Understanding DMD</button>
            <button type="button">Genetics & Testing</button>
            <button type="button">Care & Treatment</button>
            <button type="button">Family Support</button>
            <button type="button">Clinical Trials</button>
          </div>

          <div className="footer-column">
            <h3>For Professionals</h3>

            <button type="button">Clinical Platform</button>
            <button type="button">Patient Screening</button>
            <button type="button">Genetic Analysis</button>
            <button type="button">AI Risk Assessment</button>
            <button type="button">Research Collaboration</button>
          </div>

          <div className="footer-column footer-contact">
            <h3>Stay Connected</h3>

            <p>
              Receive important DMD-AI updates, research developments, and
              platform news.
            </p>

            <div className="footer-email-box">
              <Mail size={18} />

              <input
                type="email"
                placeholder="Enter your email"
                aria-label="Email address"
              />

              <button type="button" aria-label="Subscribe">
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="footer-security">
              <ShieldCheck size={18} />

              <span>
                Privacy and responsible data use are central to our platform
                design.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-container footer-bottom-inner">
          <p>© 2026 DMD-AI. All rights reserved.</p>

          <div className="footer-legal">
            <button type="button">Privacy</button>
            <button type="button">Terms</button>
            <button type="button">Medical Disclaimer</button>
            <button type="button">Data & Research Ethics</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;