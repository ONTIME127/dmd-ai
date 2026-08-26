import { useState } from "react";

import {
  ChevronDown,
  Dna,
  Menu,
  Sparkles,
  X,
} from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

import "./Navbar.css";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const goToSection = (sectionId: string) => {
    closeMenu();

    if (location.pathname !== "/") {
      navigate(`/#${sectionId}`);

      setTimeout(() => {
        document
          .getElementById(sectionId)
          ?.scrollIntoView({
            behavior: "smooth",
          });
      }, 150);

      return;
    }

    document
      .getElementById(sectionId)
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  const goHome = () => {
    closeMenu();

    if (location.pathname !== "/") {
      navigate("/");
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <>
      <div className="announcement-bar">
        <div className="announcement-content">
          <span>
            <Sparkles size={16} />

            Advancing DMD care with AI-powered intelligence and genomic
            insights.
          </span>

          <button
            type="button"
            className="announcement-link"
            onClick={() => goToSection("research")}
          >
            Learn More
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <header className="main-navbar">
        <div className="navbar-container">
          <button
            type="button"
            className="brand"
            onClick={goHome}
          >
            <div className="brand-icon">
              <Dna size={30} strokeWidth={2.2} />
            </div>

            <div className="brand-copy">
              <strong>DMD-AI</strong>
              <span>Detect. Understand. Treat. Hope.</span>
            </div>
          </button>

          <nav
            className={`desktop-nav ${
              menuOpen ? "mobile-open" : ""
            }`}
          >
            <button
              type="button"
              className={
                location.pathname === "/"
                  ? "active-link"
                  : ""
              }
              onClick={goHome}
            >
              Home
            </button>

            <button
              type="button"
              onClick={() => goToSection("about")}
            >
              About DMD
            </button>

            <button
              type="button"
              onClick={() =>
                goToSection("how-it-works")
              }
            >
              How It Works
            </button>

            <button
              type="button"
              onClick={() =>
                goToSection("families")
              }
            >
              Families & Caregivers
            </button>

            <button
              type="button"
              onClick={() =>
                goToSection("hospitals")
              }
            >
              Healthcare Professionals
            </button>

            <button
              type="button"
              onClick={() =>
                goToSection("research")
              }
            >
              Research
            </button>

            <button
              className="resources-link"
              type="button"
              onClick={() =>
                goToSection("resources")
              }
            >
              Resources
              <ChevronDown size={15} />
            </button>
          </nav>

          <div className="navbar-actions">
            <button
              className="login-button"
              type="button"
              onClick={() => navigate("/login")}
            >
              Log In
            </button>

            <button
              className="signup-button"
              type="button"
              onClick={() =>
                navigate("/signup")
              }
            >
              Sign Up
            </button>
          </div>

          <button
            className="mobile-menu-button"
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() =>
              setMenuOpen((current) => !current)
            }
          >
            {menuOpen ? (
              <X size={25} />
            ) : (
              <Menu size={25} />
            )}
          </button>
        </div>
      </header>
    </>
  );
}

export default Navbar;