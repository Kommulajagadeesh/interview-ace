export type QuestionCategory =
  | "dsa"
  | "web"
  | "dbms"
  | "os"
  | "networking"
  | "hr"
  | "java"
  | "python"
  | "cpp";

export interface MCQQuestion {
  id: string;
  category: QuestionCategory;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export const mcqQuestionBank: Record<QuestionCategory, Omit<MCQQuestion, "id" | "category">[]> = {
  dsa: [
    {
      text: "What is the time complexity of searching in a balanced Binary Search Tree (BST)?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correctOptionIndex: 1,
      explanation: "In a balanced BST, the height of the tree is log n, so searching takes O(log n) time in the worst case."
    },
    {
      text: "Which data structure operates on a Last In First Out (LIFO) basis?",
      options: ["Queue", "Stack", "Heap", "Singly Linked List"],
      correctOptionIndex: 1,
      explanation: "A stack is a LIFO (Last In First Out) structure. Elements are inserted (push) and removed (pop) from the same end."
    },
    {
      text: "What is the worst-case time complexity of Quick Sort?",
      options: ["O(n log n)", "O(n)", "O(n^2)", "O(log n)"],
      correctOptionIndex: 2,
      explanation: "In the worst case (e.g. when the array is already sorted and the pivot chosen is always the extreme element), Quick Sort runs in O(n^2) time."
    },
    {
      text: "Which graph traversal algorithm uses a Queue as its helper data structure?",
      options: ["Breadth-First Search (BFS)", "Depth-First Search (DFS)", "Kruskal's Algorithm", "Dijkstra's Algorithm"],
      correctOptionIndex: 0,
      explanation: "BFS explores level by level and uses a Queue (FIFO) to track nodes to visit, whereas DFS uses a Stack (LIFO)."
    },
    {
      text: "What is the primary advantage of a Hash Table?",
      options: ["Elements are kept in sorted order", "Uses very little memory", "O(1) average time complexity for insertion, deletion, and lookup", "Supports fast range queries"],
      correctOptionIndex: 2,
      explanation: "A Hash Table maps keys to values using a hashing function, offering O(1) average time complexity for basic operations."
    }
  ],
  web: [
    {
      text: "Which of the following is NOT a built-in React Hook?",
      options: ["useState", "useEffect", "useFetcher", "useContext"],
      correctOptionIndex: 2,
      explanation: "useFetcher is not a built-in React hook. useState, useEffect, and useContext are standard React hooks."
    },
    {
      text: "What does DOM stand for in Web Development?",
      options: ["Document Object Model", "Data Object Management", "Digital Ordinance Map", "Desktop Operations Manager"],
      correctOptionIndex: 0,
      explanation: "DOM stands for Document Object Model, which represents an XML or HTML document as a structured tree."
    },
    {
      text: "What is the purpose of the 'key' prop in React lists?",
      options: ["To style list items uniquely", "To help React identify which items have changed, been added, or been removed", "To bind click event handlers", "To encrypt list data"],
      correctOptionIndex: 1,
      explanation: "Keys help React identify which items have changed, are added, or are removed. They give elements a stable identity."
    },
    {
      text: "Which of the following describes JavaScript 'closures'?",
      options: ["A function that accepts another function as an argument", "A function that has access to variables from its outer scope even after the outer function has closed", "Ending a JavaScript statement with a semicolon", "Wrapping code inside a try-catch block"],
      correctOptionIndex: 1,
      explanation: "A closure is the combination of a function bundled together with references to its surrounding state (the lexical environment)."
    },
    {
      text: "What is the difference between '==' and '===' operators in JavaScript?",
      options: ["'==' checks value only, '===' checks both value and type", "'==' checks both value and type, '===' checks value only", "They are identical in behavior", "'===' is only used for strings"],
      correctOptionIndex: 0,
      explanation: "'==' compares values after converting their types (loose equality), while '===' compares values and types without conversion (strict equality)."
    }
  ],
  dbms: [
    {
      text: "Which SQL join returns all records from the left table and the matched records from the right table?",
      options: ["INNER JOIN", "FULL JOIN", "LEFT JOIN", "RIGHT JOIN"],
      correctOptionIndex: 2,
      explanation: "LEFT JOIN (or LEFT OUTER JOIN) returns all rows from the left table, and matching rows from the right table. If there is no match, NULL is returned for right table columns."
    },
    {
      text: "What does ACID stand for in relational databases?",
      options: ["Atomicity, Consistency, Isolation, Durability", "Action, Constraint, Index, Database", "Aggregation, Collision, Integration, Distribution", "Algorithm, Command, Iteration, Deletion"],
      correctOptionIndex: 0,
      explanation: "ACID stands for Atomicity (all or nothing), Consistency (valid state), Isolation (independent transactions), and Durability (persistence)."
    },
    {
      text: "Which of the following is used to uniquely identify a row in a database table?",
      options: ["Foreign Key", "Primary Key", "Index", "Composite Column"],
      correctOptionIndex: 1,
      explanation: "A Primary Key is a column or set of columns that uniquely identifies each row in a table. It cannot contain NULL values."
    },
    {
      text: "What is the primary purpose of Database Normalization?",
      options: ["To encrypt data", "To reduce data redundancy and improve data integrity", "To speed up query performance for large datasets", "To backup database tables automatically"],
      correctOptionIndex: 1,
      explanation: "Normalization is the process of organizing data in a database to minimize redundancy and prevent anomalies during updates."
    },
    {
      text: "In database queries, which clause is used to filter groups returned by a GROUP BY clause?",
      options: ["WHERE", "HAVING", "ORDER BY", "SELECT"],
      correctOptionIndex: 1,
      explanation: "HAVING is used to filter groups (aggregate results) returned by GROUP BY. WHERE is used to filter individual rows before grouping."
    }
  ],
  os: [
    {
      text: "What is a 'deadlock' in operating systems?",
      options: [
        "A process terminates unexpectedly due to lack of memory",
        "A set of processes are blocked because each process holds a resource and waits for another resource held by another process",
        "The CPU goes into standby mode to save power",
        "A crash in the OS kernel that requires a system reboot"
      ],
      correctOptionIndex: 1,
      explanation: "Deadlock is a state where a set of processes are blocked because each process is holding a resource and waiting for another resource held by some other process."
    },
    {
      text: "What is virtual memory in an operating system?",
      options: [
        "Memory stored in cloud servers",
        "A hardware chip that increases RAM capacity physically",
        "A storage allocation scheme where secondary memory can be addressed as if it were part of main memory (RAM)",
        "Memory used only by virtual machine guests"
      ],
      correctOptionIndex: 2,
      explanation: "Virtual memory maps virtual addresses used by an application into physical addresses in computer memory or disk storage."
    },
    {
      text: "Which scheduling algorithm allocates the CPU to the process that arrives first?",
      options: ["Round Robin (RR)", "Shortest Job First (SJF)", "First-Come, First-Served (FCFS)", "Priority Scheduling"],
      correctOptionIndex: 2,
      explanation: "FCFS is a non-preemptive algorithm that schedules processes strictly based on their order of arrival in the ready queue."
    }
  ],
  networking: [
    {
      text: "On which layer of the OSI model does the Internet Protocol (IP) operate?",
      options: ["Application Layer", "Transport Layer", "Network Layer", "Physical Layer"],
      correctOptionIndex: 2,
      explanation: "IP operates at the Network Layer (Layer 3) of the OSI model. It is responsible for routing packets across network boundaries."
    },
    {
      text: "What is the primary difference between TCP and UDP protocols?",
      options: [
        "TCP is connectionless and fast, UDP is connection-oriented and reliable",
        "TCP is connection-oriented and reliable, UDP is connectionless and faster",
        "TCP operates at the Application Layer, UDP at the Transport Layer",
        "TCP is used for web traffic, UDP is only used for local area networks"
      ],
      correctOptionIndex: 1,
      explanation: "TCP establishes a connection and guarantees delivery of packets in order. UDP sends packets without connection setup, making it faster but less reliable."
    },
    {
      text: "What is the function of DNS (Domain Name System)?",
      options: [
        "To encrypt email communication",
        "To translate human-readable domain names (like google.com) into machine-readable IP addresses",
        "To distribute incoming web traffic across multiple servers",
        "To act as a firewall against malicious requests"
      ],
      correctOptionIndex: 1,
      explanation: "DNS acts as the phonebook of the internet, mapping domain names to numerical IP addresses that computers use to identify each other."
    }
  ],
  hr: [
    {
      text: "What does the STAR method stand for in behavioral interview answers?",
      options: [
        "Status, Task, Action, Reaction",
        "Situation, Task, Action, Result",
        "Source, Technology, Analysis, Resolution",
        "System, Target, Answer, Review"
      ],
      correctOptionIndex: 1,
      explanation: "STAR stands for Situation, Task, Action, and Result. It is a structured format for answering behavioral interview questions."
    },
    {
      text: "How should you answer the common question: 'What is your greatest weakness?'",
      options: [
        "Say you have no weaknesses and are perfect",
        "Mention a genuine technical weakness and explain the concrete steps you are taking to improve it",
        "Give a disguised strength like 'I work too hard'",
        "Say something highly negative that makes you unqualified for the role"
      ],
      correctOptionIndex: 1,
      explanation: "The best answer demonstrates self-awareness by admitting a real area for growth and showing active progress in overcoming it."
    }
  ],
  java: [
    {
      text: "Which of the following is NOT a pillar of Object-Oriented Programming?",
      options: ["Encapsulation", "Polymorphism", "Compilation", "Inheritance"],
      correctOptionIndex: 2,
      explanation: "Compilation is the process of translating code into bytecode. The four OOP pillars are Encapsulation, Inheritance, Polymorphism, and Abstraction."
    },
    {
      text: "What is the difference between 'final', 'finally', and 'finalize' in Java?",
      options: [
        "They are synonyms and can be used interchangeably",
        "'final' is a keyword for constants/non-subclassing; 'finally' is a block in exception handling; 'finalize' is a garbage collection cleanup method",
        "'final' handles errors; 'finally' is for constants; 'finalize' terminates loops",
        "They are all memory allocation operations"
      ],
      correctOptionIndex: 1,
      explanation: "'final' makes a class, method, or variable immutable/non-inheritable. 'finally' is a block that always executes after try-catch. 'finalize' is called before garbage collecting an object (deprecated)."
    }
  ],
  python: [
    {
      text: "What is the purpose of Python's GIL (Global Interpreter Lock)?",
      options: [
        "To speed up execution of mathematical operations",
        "To ensure that only one thread executes Python bytecode at a time, keeping CPython thread-safe",
        "To block import of external modules",
        "To encrypt Python files for deployment"
      ],
      correctOptionIndex: 1,
      explanation: "CPython uses a GIL to protect memory management from concurrent access, ensuring thread safety but limiting CPU-bound multithreaded performance."
    },
    {
      text: "In Python, what is the difference between lists and tuples?",
      options: [
        "Lists are immutable, tuples are mutable",
        "Lists are mutable, tuples are immutable",
        "Lists are only for strings, tuples are for numbers",
        "Lists have a fixed size, tuples can change size"
      ],
      correctOptionIndex: 1,
      explanation: "Lists are mutable and can be modified after creation. Tuples are immutable and their contents cannot be changed after creation."
    }
  ],
  cpp: [
    {
      text: "What is a pointer in C++?",
      options: [
        "A visual indicator on the screen",
        "A variable that holds the memory address of another variable",
        "A function that returns a boolean value",
        "A data type that can only store integers"
      ],
      correctOptionIndex: 1,
      explanation: "A pointer is a variable whose value is the address of another variable in memory."
    },
    {
      text: "What is the purpose of a destructor in C++?",
      options: [
        "To compile the class definition",
        "To allocate memory for the object on the heap",
        "To clean up resources and deallocate memory when an object goes out of scope",
        "To delete database tables connected to the object"
      ],
      correctOptionIndex: 2,
      explanation: "Destructors are automatically invoked when an object is destroyed or goes out of scope, typically releasing allocated memory or closing file pointers."
    }
  ]
};

// Generates general MCQ questions when resume matches or fallback
export function getMCQQuestions(category: QuestionCategory | "mixed", count: number = 5): MCQQuestion[] {
  let pool: Omit<MCQQuestion, "id" | "category">[] = [];
  
  if (category === "mixed") {
    // Combine all
    Object.keys(mcqQuestionBank).forEach((cat) => {
      pool = [...pool, ...mcqQuestionBank[cat as QuestionCategory]];
    });
  } else {
    pool = mcqQuestionBank[category] || [];
  }

  // Shuffle and add ID
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((q, idx) => ({
    ...q,
    id: `mcq-${category}-${idx + 1}`,
    category: category === "mixed" ? "dsa" : category
  }));
}

// Generate MCQs based on resume matching
export function generateMCQFromResume(resumeText: string, count: number = 5): MCQQuestion[] {
  if (!resumeText) {
    return getMCQQuestions("mixed", count);
  }

  const normalized = resumeText.toLowerCase();
  let pool: Omit<MCQQuestion, "id" | "category">[] = [];
  const matchedCategories: QuestionCategory[] = [];

  // Match resume skills with categories
  const categoryKeywords: Record<QuestionCategory, string[]> = {
    web: ["react", "javascript", "typescript", "html", "css", "node", "next.js", "frontend"],
    dsa: ["algorithms", "structures", "complexity", "graph", "tree", "sort", "search"],
    dbms: ["sql", "database", "query", "postgres", "mysql", "mongodb", "oracle", "normalization"],
    os: ["operating system", "linux", "thread", "process", "memory", "deadlock"],
    networking: ["network", "protocol", "http", "tcp", "udp", "ip", "dns"],
    java: ["java", "spring", "maven"],
    python: ["python", "django", "flask", "numpy", "pandas"],
    cpp: ["c++", "cpp", "pointer"],
    hr: ["project", "experience", "role", "team"]
  };

  Object.entries(categoryKeywords).forEach(([cat, keywords]) => {
    const isMatched = keywords.some(keyword => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:\\b|\\s|^)${escaped}(?:\\b|\\s|$|[.,!?;])`, 'i');
      return regex.test(normalized);
    });
    if (isMatched) {
      matchedCategories.push(cat as QuestionCategory);
      pool = [...pool, ...mcqQuestionBank[cat as QuestionCategory]];
    }
  });

  // Fallback to all if nothing matched
  if (pool.length === 0) {
    return getMCQQuestions("mixed", count);
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((q, idx) => {
    // Find matching category or default
    const originalCat = (Object.keys(mcqQuestionBank) as QuestionCategory[]).find(cat => 
      mcqQuestionBank[cat].includes(q)
    ) || "dsa";
    return {
      ...q,
      id: `mcq-resume-${idx + 1}`,
      category: originalCat
    };
  });
}
