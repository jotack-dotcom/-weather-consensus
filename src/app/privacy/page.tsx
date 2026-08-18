export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#020617] px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <a
          href="/"
          className="text-sm font-semibold text-cyan-400 transition hover:text-cyan-300"
        >
          ← Back to HowHot.today
        </a>

        <h1 className="mt-8 text-4xl font-bold tracking-tight">
          Privacy & Contact
        </h1>

        <p className="mt-3 text-slate-400">
          Last updated: August 18, 2026
        </p>

        <section className="mt-10 space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div>
            <h2 className="text-xl font-bold">About HowHot.today</h2>
            <p className="mt-2 leading-7 text-slate-300">
              HowHot.today compares available weather models to give a clearer
              weather forecast. Weather information is provided for general
              information only and should not be used for safety-critical
              decisions.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold">Location</h2>
            <p className="mt-2 leading-7 text-slate-300">
              The site only requests your location if you press the “Use my
              location” button and approve the request in your browser. Your
              location is used to show weather for your area. You can deny or
              revoke location permission at any time in your browser settings.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold">Weather data</h2>
            <p className="mt-2 leading-7 text-slate-300">
              City searches, coordinates, and weather forecasts are processed
              through Open-Meteo to provide weather results. Open-Meteo may
              process technical information required to serve those requests.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold">Analytics</h2>
            <p className="mt-2 leading-7 text-slate-300">
              HowHot.today uses Vercel Web Analytics to understand general
              visitor activity and improve the site. We do not sell personal
              information.
            </p>
          </div>

          <div>
  <h2 className="text-xl font-bold">Your choices</h2>

  <p className="mt-2 leading-7 text-slate-300">
    You can choose not to share your location and search for a city instead.
    Favorite cities are saved only in your own browser and are not sent to our
    servers. You can remove favorites at any time using the × button.
  </p>

  <p className="mt-2 leading-7 text-slate-300">
    If advertising or additional tracking is added in the future, this privacy
    page will be updated.
  </p>
</div>

          <div>
            <h2 className="text-xl font-bold">Contact</h2>
            <p className="mt-2 leading-7 text-slate-300">
              Questions about this site or privacy? Email us at{" "}
              <a
                href="mailto:howhottoday@gmail.com"
                className="font-semibold text-cyan-400 hover:text-cyan-300"
              >
                howhottoday@gmail.com
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}