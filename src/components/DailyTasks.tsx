import { useState, useEffect } from "react";
import { CheckCircle2, Circle, ListTodo } from "lucide-react";

interface Task {
  id: number;
  text: string;
  completed: boolean;
}

const defaultTasks: Task[] = [
  { id: 1, text: "Complete 1 mock interview session", completed: false },
  { id: 2, text: "Review your recent session feedback", completed: false },
  { id: 3, "text": "Read one article on interview tips", completed: false },
];

const DailyTasks = () => {
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [dateKey, setDateKey] = useState<string>("");

  useEffect(() => {
    // Get current date string (YYYY-MM-DD)
    const today = new Date().toISOString().split("T")[0];
    const key = `dailyTasks_${today}`;
    setDateKey(key);

    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setTasks(JSON.parse(stored));
      } catch (e) {
        setTasks(defaultTasks);
      }
    } else {
      setTasks(defaultTasks);
    }
  }, []);

  const toggleTask = (id: number) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTasks(updated);
    if (dateKey) {
      localStorage.setItem(dateKey, JSON.stringify(updated));
    }
  };

  const progress = Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) || 0;

  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-foreground">
          <ListTodo className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold tracking-tight">Daily Tasks</h3>
        </div>
        <span className="text-sm font-semibold text-primary">{progress}%</span>
      </div>

      <div className="h-1.5 bg-secondary rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-3 flex-1">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={`w-full group p-4 rounded-xl border transition-all duration-300 flex items-start gap-3 text-left
              ${task.completed 
                ? "bg-primary/5 border-primary/20 hover:bg-primary/10" 
                : "bg-background/50 border-border/50 hover:border-primary/30"
              }`}
          >
            <div className="mt-0.5 shrink-0 transition-colors duration-300">
              {task.completed ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground group-hover:text-primary/70" />
              )}
            </div>
            <span className={`text-sm font-medium leading-tight transition-all duration-300 ${task.completed ? "text-primary/80 line-through decoration-primary/30" : "text-foreground"}`}>
              {task.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DailyTasks;
