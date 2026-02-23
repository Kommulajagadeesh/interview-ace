import { Brain } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="container px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-gradient">InterviewAI</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            AI-Powered Interview Preparation & Evaluation System
          </p>
          <p className="text-xs text-muted-foreground">© 2026 InterviewAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
