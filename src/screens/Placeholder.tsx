/** Fane, der bygges i en senere milepæl. */
export function Placeholder({ title, milestone }: { title: string; milestone: number }) {
  return (
    <main className="screen">
      <header className="screen__head">
        <h1 className="title">{title}</h1>
      </header>
      <section className="card empty">
        <p>Kommer i milepæl {milestone}.</p>
      </section>
    </main>
  );
}
