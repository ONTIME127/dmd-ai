import {
  ArrowRight,
  Baby,
  BookOpen,
  Dna,
  FileHeart,
  FlaskConical,
  HeartHandshake,
  Search,
  Stethoscope,
} from "lucide-react";

import "./Resources.css";

const resources = [
  {
    icon: BookOpen,
    title: "Understanding DMD",
    description:
      "Clear explanations of Duchenne muscular dystrophy, early signs, progression, and important terminology.",
    category: "Education",
  },
  {
    icon: Dna,
    title: "Genetics & Testing",
    description:
      "Learn about the DMD gene, inheritance, carrier testing, molecular testing, and genetic counselling.",
    category: "Genetics",
  },
  {
    icon: Stethoscope,
    title: "Care & Treatment",
    description:
      "Explore information about multidisciplinary DMD care, monitoring, treatment approaches, and specialist support.",
    category: "Clinical Care",
  },
  {
    icon: HeartHandshake,
    title: "Families & Caregivers",
    description:
      "Practical resources for families navigating appointments, reports, care planning, and everyday life with DMD.",
    category: "Family Support",
  },
  {
    icon: FileHeart,
    title: "Healthcare Professionals",
    description:
      "Clinical resources designed for professionals involved in screening, diagnosis, genetics, monitoring, and DMD care.",
    category: "Professional",
  },
  {
    icon: FlaskConical,
    title: "Research & Clinical Trials",
    description:
      "Explore responsible information about DMD research, emerging therapies, scientific studies, and clinical trials.",
    category: "Research",
  },
];

function Resources() {
  return (
    <section className="resources-section" id="resources">
      <div className="resources-container">
        <div className="resources-header">
          <div className="resources-kicker">
            <BookOpen size={17} />
            <span>DMD Resources</span>
          </div>

          <h2>
            Reliable Information.
            <br />
            <span>Easier to Understand.</span>
          </h2>

          <p>
            DMD can involve complicated medical, genetic, and scientific
            information. Our resource center is designed to help families,
            clinicians, and researchers find clearer information in one place.
          </p>
        </div>

        <div className="resources-search-panel">
          <div className="resources-search-box">
            <Search size={22} />

            <input
              type="text"
              placeholder="Search DMD resources, genetics, treatment, care..."
              aria-label="Search DMD resources"
            />

            <button type="button">Search</button>
          </div>

          <div className="resources-popular-searches">
            <span>Popular:</span>

            <button type="button">Early Signs</button>
            <button type="button">CK Testing</button>
            <button type="button">Genetics</button>
            <button type="button">Carrier Testing</button>
            <button type="button">Treatment</button>
          </div>
        </div>

        <div className="resources-grid">
          {resources.map((resource) => {
            const Icon = resource.icon;

            return (
              <article className="resource-card" key={resource.title}>
                <div className="resource-card-top">
                  <div className="resource-icon">
                    <Icon size={27} />
                  </div>

                  <span className="resource-category">{resource.category}</span>
                </div>

                <h3>{resource.title}</h3>

                <p>{resource.description}</p>

                <button className="resource-link" type="button">
                  Explore Resources
                  <ArrowRight size={18} />
                </button>
              </article>
            );
          })}
        </div>

        <div className="resources-help-panel">
          <div className="resources-help-icon">
            <Baby size={30} />
          </div>

          <div className="resources-help-copy">
            <span>NOT SURE WHERE TO START?</span>

            <h3>Concerned about possible signs of DMD?</h3>

            <p>
              Learn about early warning signs, what information may be useful
              to discuss with a healthcare professional, and why appropriate
              clinical and genetic evaluation matters.
            </p>
          </div>

          <button className="resources-help-button" type="button">
            Learn About Early Signs
            <ArrowRight size={19} />
          </button>
        </div>

        <div className="resources-information-note">
          <strong>Medical information notice:</strong>

          <p>
            Resources provided through DMD-AI are intended for education and
            decision support. They do not replace professional medical advice,
            diagnosis, genetic counselling, or treatment from qualified
            healthcare professionals.
          </p>
        </div>
      </div>
    </section>
  );
}

export default Resources;