export interface OnboardingQuestion {
  id: string;
  category: string;
  text: string;
}

export const defaultIntakeQuestions: OnboardingQuestion[] = [
  // DSA (5)
  { id: "dsa1", category: "Data Structures & Algorithms", text: "Familiar with Big-O notation and complexity analysis?" },
  { id: "dsa2", category: "Data Structures & Algorithms", text: "Understand arrays, strings, and linked lists?" },
  { id: "dsa3", category: "Data Structures & Algorithms", text: "Can implement stacks and queues?" },
  { id: "dsa4", category: "Data Structures & Algorithms", text: "Understand binary search and sorting algorithms?" },
  { id: "dsa5", category: "Data Structures & Algorithms", text: "Know basic recursion and dynamic programming?" },
  // Web (5)
  { id: "web1", category: "Web Development", text: "Comfortable with semantic HTML and layouts?" },
  { id: "web2", category: "Web Development", text: "Can write responsive CSS using Grid and Flexbox?" },
  { id: "web3", category: "Web Development", text: "Understand JavaScript closures and event loops?" },
  { id: "web4", category: "Web Development", text: "Familiar with React hooks (useState, useEffect)?" },
  { id: "web5", category: "Web Development", text: "Understand REST API design principles?" },
  // DBMS (4)
  { id: "dbms1", category: "Database Systems", text: "Can write SQL queries using JOINs?" },
  { id: "dbms2", category: "Database Systems", text: "Understand database normalization (1NF, 2NF, 3NF)?" },
  { id: "dbms3", category: "Database Systems", text: "Familiar with ACID properties and transactions?" },
  { id: "dbms4", category: "Database Systems", text: "Know the differences between SQL and NoSQL?" },
  // OS (4)
  { id: "os1", category: "Operating Systems", text: "Understand process vs. thread differences?" },
  { id: "os2", category: "Operating Systems", text: "Familiar with CPU scheduling algorithms?" },
  { id: "os3", category: "Operating Systems", text: "Know virtual memory and paging concepts?" },
  { id: "os4", category: "Operating Systems", text: "Can explain deadlocks and semaphore sync?" },
  // Networking (3)
  { id: "net1", category: "Computer Networks", text: "Know TCP vs. UDP differences?" },
  { id: "net2", category: "Computer Networks", text: "Understand DNS resolution process?" },
  { id: "net3", category: "Computer Networks", text: "Know HTTP request lifecycle?" },
  // HR (3)
  { id: "hr1", category: "Behavioral & HR", text: "Can introduce yourself using STAR structure?" },
  { id: "hr2", category: "Behavioral & HR", text: "Have concrete examples of resolving challenges?" },
  { id: "hr3", category: "Behavioral & HR", text: "Can list your core strengths and weaknesses?" },
  // Programming Languages (2)
  { id: "lang1", category: "Core Languages", text: "Familiar with Object-Oriented Programming (OOP) in Java/C++?" },
  { id: "lang2", category: "Core Languages", text: "Understand lists, dictionaries, and decorators in Python?" },
];

const resumeIntakeQuestions: Record<string, OnboardingQuestion[]> = {
  react: [
    { id: "res_react1", category: "React Development", text: "Are you comfortable building stateful functional components in React?" },
    { id: "res_react2", category: "React Development", text: "Do you understand React hooks (useState, useEffect, useContext, useMemo)?" },
    { id: "res_react3", category: "React Development", text: "Can you explain React virtual DOM and reconciliation processes?" }
  ],
  javascript: [
    { id: "res_js1", category: "JavaScript Fundamentals", text: "Do you understand JavaScript closures and lexical scoping?" },
    { id: "res_js2", category: "JavaScript Fundamentals", text: "Are you familiar with the event loop and asynchronous patterns (Promises, async/await)?" }
  ],
  typescript: [
    { id: "res_ts1", category: "TypeScript Type Safety", text: "Do you understand static typing, interfaces, and custom types in TypeScript?" },
    { id: "res_ts2", category: "TypeScript Type Safety", text: "Can you implement TypeScript generics and utility types?" }
  ],
  python: [
    { id: "res_py1", category: "Python Programming", text: "Are you comfortable with Python core structures (lists, dicts, sets, tuples)?" },
    { id: "res_py2", category: "Python Programming", text: "Do you understand Python decorators, generators, and the GIL?" }
  ],
  java: [
    { id: "res_java1", category: "Java & OOP", text: "Do you understand OOP principles (Inheritance, Polymorphism) in Java?" },
    { id: "res_java2", category: "Java & OOP", text: "Familiar with Java memory management, JVM, and Garbage Collection?" }
  ],
  database: [
    { id: "res_db1", category: "Database Systems", text: "Can you write complex SQL queries using multiple JOINs and aggregations?" },
    { id: "res_db2", category: "Database Systems", text: "Do you understand database indexing, normalization, and ACID transactions?" }
  ],
  sql: [
    { id: "res_sql1", category: "SQL & Querying", text: "Comfortable writing DDL and DML queries for relational databases?" }
  ],
  docker: [
    { id: "res_doc1", category: "Containerization", text: "Can you write a Dockerfile and deploy containerized applications?" }
  ],
  aws: [
    { id: "res_aws1", category: "Cloud & Devops", text: "Familiar with deploying applications on AWS (EC2, S3, RDS, Lambda)?" }
  ],
  ml: [
    { id: "res_ml1", category: "Machine Learning", text: "Do you understand supervised vs unsupervised learning, and model validation?" }
  ],
  git: [
    { id: "res_git1", category: "Version Control", text: "Are you comfortable with Git branching workflows, merging, and rebasing?" }
  ]
};

export function getIntakeQuestions(resumeText: string): OnboardingQuestion[] {
  if (!resumeText) {
    return defaultIntakeQuestions;
  }

  const normalized = resumeText.toLowerCase();
  const list: OnboardingQuestion[] = [];
  const addedIds = new Set<string>();

  Object.entries(resumeIntakeQuestions).forEach(([skill, questions]) => {
    const regex = new RegExp(`\\b${skill}\\b`, 'i');
    if (regex.test(normalized)) {
      questions.forEach((q) => {
        if (!addedIds.has(q.id)) {
          list.push(q);
          addedIds.add(q.id);
        }
      });
    }
  });

  // Always blend with general project/behavioral assessment questions to ensure a good size
  const generalIntake: OnboardingQuestion[] = [
    { id: "res_gen1", category: "Project Experience", text: "Can you explain the technical choices and architectural trade-offs in your projects?" },
    { id: "res_gen2", category: "Project Experience", text: "Are you comfortable discussing debugging and resolving challenging bugs?" },
    { id: "res_gen3", category: "Behavioral & HR", text: "Can you describe your collaboration style and how you handle project blockers?" }
  ];

  generalIntake.forEach((q) => {
    if (!addedIds.has(q.id)) {
      list.push(q);
      addedIds.add(q.id);
    }
  });

  // Fallback to defaults if resume has too few matching keywords (less than 5 questions)
  if (list.length < 5) {
    return defaultIntakeQuestions;
  }

  return list;
}
