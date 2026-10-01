import { Link } from "react-router";
import { Desk, Paper } from "@/components/Paper";

export default function About() {
  return (
    <Desk>
      <Paper variant="sheet">
        <div className="about-back">
          <Link className="ink-link" to="/">
            ← back
          </Link>
        </div>
        <div className="about-content font-hand">
          <h3>about</h3>
          <p>
            notebook is a small project with one idea: writing on the web should
            feel like writing on paper.
          </p>
          <p>
            It's inspired by{" "}
            <a href="https://telegra.ph" target="_blank" rel="noopener noreferrer">
              telegra.ph
            </a>{" "}
            — the minimal, no-account publishing tool that Telegram made. We
            loved that you could open a page, write something, and get a link. No
            signup. No dashboard. No noise.
          </p>
          <p>
            But telegra.ph felt like a web page. We wanted it to feel like a
            notebook. Ruled lines. A red margin. Handwriting. Something you'd
            actually want to write in.
          </p>
          <p>So notebook is that: telegra.ph's spirit, on paper.</p>
          <blockquote>
            no accounts, no login, no tracking
            <br />
            pages are anonymous and reachable only by their link
            <br />
            the source is open (MIT)
          </blockquote>
          <p>Write something. Tear off the page. Share the link.</p>
          <hr />
          <p className="about-footer">
            inspired by telegra.ph · open source · MIT
          </p>
        </div>
      </Paper>
    </Desk>
  );
}
