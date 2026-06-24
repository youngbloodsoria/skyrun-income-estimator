import { BarChart3, MailCheck, ShieldCheck } from "lucide-react";
import { Footer, Header } from "@/components/SiteChrome";
import { OwnerAccess } from "@/components/OwnerAccess";

export default function HomePage() {
  return (
    <div className="site-shell">
      <Header />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">Vacation rental income estimator</div>
            <h1>
              See what your property <span>could earn.</span>
            </h1>
            <p>
              Get a personalized, seasonally adjusted income projection for your Brian Head area property—built from local operating experience.
            </p>
            <div className="trust-row">
              <span className="trust-item"><span className="trust-dot" /> Private and secure</span>
              <span className="trust-item"><span className="trust-dot" /> Takes about two minutes</span>
              <span className="trust-item"><span className="trust-dot" /> No obligation</span>
            </div>
          </div>
          <div className="access-card">
            <OwnerAccess />
          </div>
        </section>
        <section className="feature-strip">
          <div className="feature">
            <BarChart3 size={25} color="#f8b91c" />
            <strong>Local market intelligence</strong>
            <p>Seasonality and booking behavior shaped around Brian Head and nearby mountain markets.</p>
          </div>
          <div className="feature">
            <ShieldCheck size={25} color="#71bc50" />
            <strong>Your results stay private</strong>
            <p>Email verification and secure account access keep property information with the right people.</p>
          </div>
          <div className="feature">
            <MailCheck size={25} color="#56baf1" />
            <strong>Save and revisit</strong>
            <p>Your estimates are saved so you and the SkyRun team can keep the conversation moving.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
