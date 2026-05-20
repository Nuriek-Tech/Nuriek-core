import {
    NURIEK_SITE_URL,
    NURIEK_MISSION,
    NURIEK_TAGLINE,
    NURIEK_HERO_LINE,
    NURIEK_SITE_PILLARS,
} from "@/lib/nuriek-brand";

export default function LoginPageShell({ children }: { children: React.ReactNode }) {
    const [lineA, lineB] = (() => {
        const parts = NURIEK_HERO_LINE.split(". ");
        if (parts.length < 2) return [NURIEK_HERO_LINE, ""];
        return [`${parts[0]}.`, parts.slice(1).join(". ").replace(/\.$/, "") + "."];
    })();

    return (
        <main className="loginPage">
            <div className="loginShell">
                <header className="loginTopBar">
                    <span className="loginMark">nuriek</span>
                    <a
                        href={NURIEK_SITE_URL}
                        className="loginTopLink"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        nuriek.com
                    </a>
                </header>

                <div className="loginGrid">
                    <section className="loginNarrative" aria-label="About nuriek">
                        <h2 className="loginNarrativeHeadline">
                            {lineA}
                            {lineB && (
                                <>
                                    <br />
                                    <span className="loginNarrativeEm">{lineB}</span>
                                </>
                            )}
                        </h2>
                        <p className="loginNarrativeMission">{NURIEK_MISSION}</p>

                        <ul className="loginValues">
                            {NURIEK_SITE_PILLARS.map((p) => (
                                <li key={p.num}>
                                    <span className="loginValuesNum">{p.num}</span>
                                    <span>
                                        <strong>{p.title}</strong>
                                        <small>{p.description}</small>
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <p className="loginNarrativeFoot">{NURIEK_TAGLINE}</p>
                    </section>

                    <section className="loginPanel" aria-label="Account access">
                        {children}
                    </section>
                </div>
            </div>
        </main>
    );
}
