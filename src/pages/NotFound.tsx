import { Link } from "react-router";
import { Desk, Paper } from "@/components/Paper";

export default function NotFound() {
  return (
    <Desk>
      <Paper variant="sheet">
        <div className="centered-paper">
          <p className="torn-note">this page seems to have been torn out</p>
          <Link className="ink-link" to="/">
            go back to the notebook →
          </Link>
        </div>
      </Paper>
    </Desk>
  );
}
