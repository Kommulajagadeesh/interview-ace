import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-background/50 backdrop-blur-sm py-16">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
          <Link to="/home" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-gradient">Smart Interview</span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/home" className="hover:text-primary transition-colors">Home</Link>
            <Link to="/learning" className="hover:text-primary transition-colors">Learning</Link>
            <Link to="/interview" className="hover:text-primary transition-colors">Interview</Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Smart Interview Preparation & Evaluation System
          </p>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} InterviewAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
