import { Link } from "react-router-dom";
import { Video, BarChart2, BookOpen, Settings, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const cards = [
  {
    title: "Mock Interview",
    description: "Start a new interactive interview session with AI.",
    icon: Video,
    to: "/interview",
    bgClass: "bg-blue-100 dark:bg-blue-900/40",
    iconColor: "text-blue-500",
  },
  {
    title: "Analytics",
    description: "View your performance metrics and session history.",
    icon: BarChart2,
    to: "/dashboard",
    bgClass: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-500",
  },
  {
    title: "Learning Hub",
    description: "Access study materials and prepare for questions.",
    icon: BookOpen,
    to: "/learning",
    bgClass: "bg-fuchsia-100 dark:bg-fuchsia-900/40",
    iconColor: "text-fuchsia-500",
  },
];

const HomeHub = () => {
  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto w-full">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Welcome to Interview Ace</h1>
        <p className="text-muted-foreground font-medium">Choose where you want to go.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <Link to={card.to} className="block group">
              <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
                {/* Top Section */}
                <div className={`${card.bgClass} h-36 flex items-center justify-center transition-colors duration-300`}>
                  <div className="w-14 h-14 bg-white dark:bg-background rounded-2xl shadow-sm flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                    <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                </div>
                
                {/* Bottom Section */}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-foreground mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground flex-1 mb-6">
                    {card.description}
                  </p>
                  <div className="flex items-center text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                    Open <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default HomeHub;
