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

export type QuestionDifficulty = "Easy" | "Medium" | "Hard";

export interface Question {
  id: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  text: string;
  idealAnswer: string;
  keywords: string[];
}

interface QuestionSeed {
  question: string;
  idealAnswer: string;
}

const categoryQuestionBank: Record<QuestionCategory, QuestionSeed[]> = {
  dsa: [
    {
      question: "What is the time complexity of binary search?",
      idealAnswer: "Binary search runs in O(log n) time because it halves the search space each step on a sorted array.",
    },
    {
      question: "Explain stack vs queue.",
      idealAnswer: "A stack follows LIFO order using push and pop, while a queue follows FIFO order using enqueue and dequeue.",
    },
    {
      question: "What is a hash table?",
      idealAnswer: "A hash table stores key-value pairs using a hash function and gives average O(1) insert, search, and delete.",
    },
    {
      question: "Explain recursion with example.",
      idealAnswer: "Recursion is when a function calls itself with a smaller input until a base case; factorial is a common example.",
    },
    {
      question: "What is dynamic programming?",
      idealAnswer: "Dynamic programming solves overlapping subproblems by storing results with memoization or tabulation.",
    },
    {
      question: "Difference between BFS and DFS?",
      idealAnswer: "BFS explores level by level using a queue, while DFS explores depth first using recursion or a stack.",
    },
    {
      question: "What is a linked list?",
      idealAnswer: "A linked list is a linear structure of nodes where each node points to the next, allowing efficient insertions and deletions.",
    },
    {
      question: "Explain merge sort.",
      idealAnswer: "Merge sort is a divide-and-conquer algorithm that splits arrays, sorts halves, and merges them in O(n log n).",
    },
    {
      question: "What is a tree data structure?",
      idealAnswer: "A tree is a hierarchical structure with a root and child nodes, and it has no cycles.",
    },
    {
      question: "What is graph traversal?",
      idealAnswer: "Graph traversal is the process of visiting graph nodes systematically, commonly using BFS or DFS.",
    },
    {
      question: "Write a function to reverse a string.",
      idealAnswer:
        "Use two pointers or built-in string operations to reverse the characters and return the reversed string in O(n) time.",
    },
    {
      question: "Write a program to check if a string is a palindrome.",
      idealAnswer:
        "Compare characters from both ends moving inward, or reverse and compare, to determine palindrome status in O(n) time.",
    },
    {
      question: "Find the largest element in an array.",
      idealAnswer:
        "Traverse the array once while tracking the maximum value found so far, which gives O(n) time and O(1) space.",
    },
    {
      question: "Given an array, return indices of two numbers that add up to a target.",
      idealAnswer:
        "Use a hash map storing value to index; for each number check if target minus current exists, achieving O(n) average time.",
    },
    {
      question: "Write a function to merge two sorted arrays.",
      idealAnswer:
        "Use two pointers and repeatedly append the smaller current element, then append leftovers, producing O(n + m) time.",
    },
    {
      question: "Implement Fibonacci using dynamic programming.",
      idealAnswer:
        "Use memoization or bottom-up tabulation to avoid repeated subproblems, resulting in O(n) time instead of exponential recursion.",
    },
    {
      question: "Find the first non-repeating character in a string.",
      idealAnswer:
        "Count character frequencies first, then scan again to return the first character with frequency one in O(n) time.",
    },
    {
      question: "Detect whether a linked list has a cycle.",
      idealAnswer:
        "Use Floyd's tortoise and hare pointers moving at different speeds; if they meet, a cycle exists in O(n) time and O(1) space.",
    },
    {
      question: "Given an array, move all zeros to the end while keeping order of non-zero elements.",
      idealAnswer:
        "Maintain a write pointer for non-zero values, then fill remaining positions with zeros for O(n) time and stable order.",
    },
    {
      question: "Validate if parentheses in a string are balanced.",
      idealAnswer:
        "Use a stack to push opening brackets and match each closing bracket with the top; valid if stack is empty at end.",
    },
    {
      question: "Write a function to check if two strings are anagrams.",
      idealAnswer:
        "Count character frequencies with a hash map or sort both strings and compare; both approaches correctly detect anagrams.",
    },
    {
      question: "Implement binary search on a sorted array.",
      idealAnswer:
        "Use low and high pointers, compute mid, and shrink the range based on comparison until found or range is empty in O(log n).",
    },
    {
      question: "Find the maximum subarray sum.",
      idealAnswer:
        "Use Kadane's algorithm by tracking current and global maximum sums while scanning once, giving O(n) time.",
    },
    {
      question: "Given coin denominations and an amount, return the minimum coins needed.",
      idealAnswer:
        "Use dynamic programming where dp[i] is minimum coins for amount i and update using each coin, with unreachable states handled safely.",
    },
    {
      question: "Find the length of the longest substring without repeating characters.",
      idealAnswer:
        "Use a sliding window with a map of last seen indices, moving the left pointer when duplicates appear, in O(n) time.",
    },
  ],
  web: [
    {
      question: "What is HTML?",
      idealAnswer: "HTML is the standard markup language used to structure content on web pages.",
    },
    {
      question: "Difference between HTML and HTML5?",
      idealAnswer: "HTML5 adds semantic tags, multimedia support, and browser APIs compared to older HTML versions.",
    },
    {
      question: "What is CSS Flexbox?",
      idealAnswer: "Flexbox is a one-dimensional CSS layout model used to align and distribute items in rows or columns.",
    },
    {
      question: "Explain JavaScript closures.",
      idealAnswer: "A closure is a function that keeps access to variables from its lexical outer scope even after the outer function returns.",
    },
    {
      question: "What is DOM?",
      idealAnswer: "The DOM is the tree representation of an HTML document that JavaScript can read and modify.",
    },
    {
      question: "Difference between var, let, const?",
      idealAnswer: "var is function scoped, let and const are block scoped, and const cannot be reassigned.",
    },
    {
      question: "What is REST API?",
      idealAnswer: "A REST API is a stateless HTTP-based interface where resources are accessed through standard methods like GET and POST.",
    },
    {
      question: "What is JSON?",
      idealAnswer: "JSON is a lightweight text format for structured data exchange using key-value pairs and arrays.",
    },
    {
      question: "Explain event bubbling.",
      idealAnswer: "Event bubbling means an event starts on the target element and propagates upward through parent elements.",
    },
    {
      question: "What is React?",
      idealAnswer: "React is a JavaScript library for building component-based user interfaces with state and props.",
    },
  ],
  dbms: [
    {
      question: "What is SQL?",
      idealAnswer: "SQL is the language used to define, query, and manage data in relational databases.",
    },
    {
      question: "What is normalization?",
      idealAnswer: "Normalization organizes data into related tables to reduce redundancy and avoid update anomalies.",
    },
    {
      question: "What is primary key?",
      idealAnswer: "A primary key is a unique, non-null column or set of columns that identifies each row in a table.",
    },
    {
      question: "Difference between SQL and NoSQL?",
      idealAnswer: "SQL databases are relational with fixed schemas, while NoSQL databases are non-relational and often schema-flexible.",
    },
    {
      question: "What is indexing?",
      idealAnswer: "Indexing creates a data structure to speed up lookups, trading extra storage and write overhead for faster reads.",
    },
    {
      question: "What is a join?",
      idealAnswer: "A join combines rows from multiple tables based on related columns such as foreign keys.",
    },
    {
      question: "Explain ACID properties.",
      idealAnswer: "ACID means Atomicity, Consistency, Isolation, and Durability to ensure reliable transaction processing.",
    },
    {
      question: "What is foreign key?",
      idealAnswer: "A foreign key is a column that references a primary key in another table to maintain referential integrity.",
    },
    {
      question: "What is a transaction?",
      idealAnswer: "A transaction is a group of operations treated as one unit that either fully commits or rolls back.",
    },
    {
      question: "What is database schema?",
      idealAnswer: "A database schema is the blueprint of tables, columns, relationships, constraints, and indexes.",
    },
    {
      question: "What is the difference between DELETE, TRUNCATE, and DROP?",
      idealAnswer: "DELETE removes selected rows, TRUNCATE removes all rows quickly, and DROP removes the table structure itself.",
    },
    {
      question: "What is a composite key?",
      idealAnswer: "A composite key uses two or more columns together to uniquely identify a row.",
    },
    {
      question: "What is a candidate key?",
      idealAnswer: "A candidate key is a minimal column set that can uniquely identify rows; one is chosen as the primary key.",
    },
    {
      question: "What is a unique key?",
      idealAnswer: "A unique key enforces uniqueness in a column or set of columns and prevents duplicate values.",
    },
    {
      question: "What is the difference between WHERE and HAVING?",
      idealAnswer: "WHERE filters rows before grouping, while HAVING filters grouped results after aggregation.",
    },
    {
      question: "What is GROUP BY in SQL?",
      idealAnswer: "GROUP BY groups rows with the same values so aggregate functions can be applied to each group.",
    },
    {
      question: "What is ORDER BY in SQL?",
      idealAnswer: "ORDER BY sorts query results by one or more columns in ascending or descending order.",
    },
    {
      question: "What is the difference between INNER JOIN and LEFT JOIN?",
      idealAnswer: "INNER JOIN returns matching rows from both tables, while LEFT JOIN returns all rows from the left table and matching right rows.",
    },
    {
      question: "What is a self join?",
      idealAnswer: "A self join joins a table with itself, commonly used for hierarchical or relationship queries within one table.",
    },
    {
      question: "What is a view in SQL?",
      idealAnswer: "A view is a virtual table based on a saved SQL query used for abstraction, security, and reuse.",
    },
    {
      question: "What is a stored procedure?",
      idealAnswer: "A stored procedure is a precompiled SQL routine stored in the database for reusable business logic.",
    },
    {
      question: "What is a trigger in DBMS?",
      idealAnswer: "A trigger is a database object that automatically executes in response to insert, update, or delete events.",
    },
    {
      question: "What is a subquery?",
      idealAnswer: "A subquery is a query nested inside another SQL query and used in SELECT, FROM, or WHERE clauses.",
    },
    {
      question: "What are aggregate functions in SQL?",
      idealAnswer: "Aggregate functions like COUNT, SUM, AVG, MIN, and MAX compute summary values across rows.",
    },
    {
      question: "What is a clustered index?",
      idealAnswer: "A clustered index stores table data physically in index order and typically only one exists per table.",
    },
    {
      question: "What is a non-clustered index?",
      idealAnswer: "A non-clustered index stores a separate index structure with pointers to data rows and multiple can exist per table.",
    },
    {
      question: "What is denormalization?",
      idealAnswer: "Denormalization intentionally adds redundancy to improve read performance at the cost of extra storage and update complexity.",
    },
    {
      question: "What is the difference between OLTP and OLAP?",
      idealAnswer: "OLTP handles frequent transactional operations, while OLAP handles analytical queries on large historical datasets.",
    },
    {
      question: "What is referential integrity?",
      idealAnswer: "Referential integrity ensures relationships between tables stay valid, usually enforced by foreign key constraints.",
    },
    {
      question: "What is a deadlock in databases?",
      idealAnswer: "A database deadlock occurs when transactions wait on each other in a cycle and none can proceed.",
    },
    {
      question: "What is SQL injection and how to prevent it?",
      idealAnswer: "SQL injection is malicious query manipulation through inputs, prevented using parameterized queries, validation, and least privilege.",
    },
    {
      question: "What is a CTE in SQL?",
      idealAnswer: "A Common Table Expression is a temporary named result set defined with WITH and used to simplify complex queries.",
    },
    {
      question: "What is window function in SQL?",
      idealAnswer: "Window functions compute values across related rows without collapsing them, using OVER clauses like ROW_NUMBER and RANK.",
    },
    {
      question: "What is the difference between UNION and UNION ALL?",
      idealAnswer: "UNION removes duplicates when combining results, while UNION ALL keeps duplicates and is usually faster.",
    },
    {
      question: "What are database locks?",
      idealAnswer: "Locks control concurrent access to data and protect consistency by preventing conflicting operations.",
    },
    {
      question: "What is isolation level in transactions?",
      idealAnswer: "Isolation levels define how transaction changes are visible to others, balancing consistency and concurrency.",
    },
    {
      question: "What is CAP theorem in distributed databases?",
      idealAnswer: "CAP theorem states distributed systems can guarantee at most two of Consistency, Availability, and Partition tolerance simultaneously.",
    },
    {
      question: "What is sharding in databases?",
      idealAnswer: "Sharding horizontally partitions data across multiple database nodes to improve scalability and throughput.",
    },
    {
      question: "What is replication in databases?",
      idealAnswer: "Replication copies data across servers to improve availability, fault tolerance, and read performance.",
    },
    {
      question: "How do you optimize a slow SQL query?",
      idealAnswer: "Analyze execution plan, add suitable indexes, avoid unnecessary columns and joins, and rewrite expensive predicates.",
    },
  ],
  os: [
    {
      question: "What is an operating system?",
      idealAnswer: "An operating system manages hardware resources and provides services for applications, users, memory, files, and processes.",
    },
    {
      question: "What is process vs thread?",
      idealAnswer: "A process has its own memory space, while threads are lightweight execution units that share process memory.",
    },
    {
      question: "What is deadlock?",
      idealAnswer: "Deadlock is a state where processes wait forever for resources held by each other.",
    },
    {
      question: "Explain CPU scheduling.",
      idealAnswer: "CPU scheduling decides which process runs next using policies like FCFS, SJF, Priority, and Round Robin.",
    },
    {
      question: "What is virtual memory?",
      idealAnswer: "Virtual memory extends RAM using disk and maps virtual addresses to physical memory pages.",
    },
    {
      question: "What is paging?",
      idealAnswer: "Paging splits memory into fixed-size pages and frames, allowing non-contiguous allocation.",
    },
    {
      question: "What is context switching?",
      idealAnswer: "Context switching saves one task state and restores another so the CPU can switch between tasks.",
    },
    {
      question: "What is semaphore?",
      idealAnswer: "A semaphore is a synchronization primitive used to control concurrent access to shared resources.",
    },
    {
      question: "What is multi-threading?",
      idealAnswer: "Multithreading allows multiple threads in one process to run concurrently for better responsiveness and throughput.",
    },
    {
      question: "What is kernel?",
      idealAnswer: "The kernel is the core part of an OS that handles low-level operations like memory, scheduling, and device control.",
    },
  ],
  networking: [
    {
      question: "What is TCP/IP?",
      idealAnswer: "TCP/IP is the core protocol suite of the internet, where IP handles addressing and routing and TCP handles reliable transport.",
    },
    {
      question: "Difference between TCP and UDP?",
      idealAnswer: "TCP is connection-oriented and reliable with ordered delivery, while UDP is connectionless, faster, and best-effort.",
    },
    {
      question: "What is HTTP?",
      idealAnswer: "HTTP is an application-layer request-response protocol used to transfer web resources.",
    },
    {
      question: "What is DNS?",
      idealAnswer: "DNS translates domain names into IP addresses so clients can locate servers.",
    },
    {
      question: "What is IP address?",
      idealAnswer: "An IP address is a unique logical identifier assigned to a device on a network.",
    },
    {
      question: "What is OSI model?",
      idealAnswer: "The OSI model is a seven-layer framework from Physical to Application used to understand network communication.",
    },
    {
      question: "What is firewall?",
      idealAnswer: "A firewall monitors and filters incoming and outgoing network traffic based on security rules.",
    },
    {
      question: "What is subnetting?",
      idealAnswer: "Subnetting divides a network into smaller subnetworks to improve performance, control, and IP usage.",
    },
    {
      question: "What is latency?",
      idealAnswer: "Latency is the delay between sending data and receiving the response, usually measured in milliseconds.",
    },
    {
      question: "What is bandwidth?",
      idealAnswer: "Bandwidth is the maximum data transfer capacity of a network link per unit time.",
    },
  ],
  hr: [
    {
      question: "Tell me about yourself.",
      idealAnswer: "Give a short present-past-future summary focused on your relevant skills, experience, and career goals.",
    },
    {
      question: "Why should we hire you?",
      idealAnswer: "Connect your top skills and measurable achievements to the role requirements and explain the value you bring.",
    },
    {
      question: "What are your strengths?",
      idealAnswer: "Mention two or three strengths relevant to the role and support each with a concrete example.",
    },
    {
      question: "What are your weaknesses?",
      idealAnswer: "Share one genuine weakness and explain what actions you are taking to improve it.",
    },
    {
      question: "Where do you see yourself in 5 years?",
      idealAnswer: "Describe growth goals aligned with the company and role, showing commitment and realistic progression.",
    },
    {
      question: "Why do you want this job?",
      idealAnswer: "Explain role fit, company mission alignment, and how your background can contribute to team goals.",
    },
    {
      question: "Describe a challenge you faced.",
      idealAnswer: "Use STAR: explain the situation, task, actions you took, and measurable result.",
    },
    {
      question: "What motivates you?",
      idealAnswer: "Describe intrinsic motivators such as solving problems, learning, impact, and team contribution.",
    },
    {
      question: "How do you handle stress?",
      idealAnswer: "Show a practical process: prioritize tasks, break work into steps, communicate risks, and stay consistent.",
    },
    {
      question: "Why did you choose this field?",
      idealAnswer: "Explain your interest, early exposure, and long-term goals that make this field a strong fit for you.",
    },
  ],
  java: [
    {
      question: "What is JVM and why is it important?",
      idealAnswer: "JVM executes Java bytecode, provides platform independence, and manages memory with garbage collection.",
    },
    {
      question: "Difference between JDK, JRE, and JVM?",
      idealAnswer: "JDK includes development tools and JRE, JRE provides runtime libraries and JVM, and JVM runs bytecode.",
    },
    {
      question: "Explain method overloading vs overriding in Java.",
      idealAnswer: "Overloading uses same method name with different parameters in same class, while overriding redefines parent method in child class.",
    },
    {
      question: "What is the difference between ArrayList and LinkedList?",
      idealAnswer: "ArrayList gives fast random access, while LinkedList is better for frequent insertions and deletions in the middle.",
    },
    {
      question: "What is an interface in Java?",
      idealAnswer: "An interface defines a contract of methods that implementing classes must provide, enabling abstraction and polymorphism.",
    },
    {
      question: "What are checked and unchecked exceptions?",
      idealAnswer: "Checked exceptions must be handled or declared at compile time, while unchecked exceptions are RuntimeException subclasses.",
    },
    {
      question: "What is garbage collection in Java?",
      idealAnswer: "Garbage collection automatically reclaims memory from unreachable objects to reduce manual memory management.",
    },
    {
      question: "Explain String, StringBuilder, and StringBuffer.",
      idealAnswer: "String is immutable, StringBuilder is mutable and faster in single-threaded use, StringBuffer is mutable and synchronized.",
    },
    {
      question: "What is the purpose of the static keyword?",
      idealAnswer: "static members belong to the class, not instances, and can be accessed without creating an object.",
    },
    {
      question: "Explain Java Stream API in short.",
      idealAnswer: "Stream API processes collections declaratively using operations like filter, map, and reduce for readable data pipelines.",
    },
  ],
  python: [
    {
      question: "What are Python lists and tuples?",
      idealAnswer: "Lists are mutable ordered collections, while tuples are immutable ordered collections.",
    },
    {
      question: "What is list comprehension?",
      idealAnswer: "List comprehension is concise syntax to create lists using an expression, loop, and optional condition.",
    },
    {
      question: "Difference between deep copy and shallow copy?",
      idealAnswer: "Shallow copy copies container references, while deep copy recursively copies nested objects.",
    },
    {
      question: "What is the use of virtual environments?",
      idealAnswer: "Virtual environments isolate project dependencies to avoid version conflicts between projects.",
    },
    {
      question: "Explain decorators in Python.",
      idealAnswer: "Decorators wrap functions or classes to add behavior without modifying original source code.",
    },
    {
      question: "What are *args and **kwargs?",
      idealAnswer: "*args captures variable positional arguments, and **kwargs captures variable keyword arguments.",
    },
    {
      question: "What is the difference between is and ==?",
      idealAnswer: "== compares values, while is compares object identity in memory.",
    },
    {
      question: "What is PEP 8?",
      idealAnswer: "PEP 8 is the Python style guide for writing readable and consistent Python code.",
    },
    {
      question: "Explain generators in Python.",
      idealAnswer: "Generators yield values lazily using yield, reducing memory usage for large sequences.",
    },
    {
      question: "What is the GIL in Python?",
      idealAnswer: "GIL allows only one thread to execute Python bytecode at a time in CPython, affecting CPU-bound threading.",
    },
  ],
  cpp: [
    {
      question: "What is the difference between C and C++?",
      idealAnswer: "C++ extends C with object-oriented programming, templates, and stronger type abstractions.",
    },
    {
      question: "Explain function overloading in C++.",
      idealAnswer: "Function overloading allows multiple functions with the same name but different parameter lists.",
    },
    {
      question: "What is a constructor and destructor?",
      idealAnswer: "A constructor initializes objects when created, and a destructor cleans up resources when objects are destroyed.",
    },
    {
      question: "What is the difference between stack and heap memory in C++?",
      idealAnswer: "Stack memory is automatic and fast for local variables, while heap memory is dynamic and manually managed with new/delete.",
    },
    {
      question: "What are pointers and references?",
      idealAnswer: "Pointers store memory addresses and can be reassigned, while references are aliases that must be initialized once.",
    },
    {
      question: "Explain virtual functions.",
      idealAnswer: "Virtual functions enable runtime polymorphism by resolving overridden methods through base-class pointers or references.",
    },
    {
      question: "What is STL in C++?",
      idealAnswer: "STL is the Standard Template Library providing containers, iterators, algorithms, and function objects.",
    },
    {
      question: "Difference between struct and class in C++?",
      idealAnswer: "Both are similar, but struct members are public by default while class members are private by default.",
    },
    {
      question: "What is RAII?",
      idealAnswer: "RAII ties resource lifetime to object lifetime so resources are acquired in constructors and released in destructors.",
    },
    {
      question: "What is the purpose of smart pointers?",
      idealAnswer: "Smart pointers manage dynamic memory automatically and help prevent leaks and dangling pointers.",
    },
  ],
};

const difficultyLevels: QuestionDifficulty[] = ["Easy", "Medium", "Hard"];
const datasetRepetitions = 20;

const keywordStopWords = new Set([
  "what",
  "with",
  "between",
  "explain",
  "difference",
  "this",
  "that",
  "your",
  "from",
  "about",
  "where",
  "when",
  "why",
  "how",
  "are",
  "and",
  "for",
  "the",
  "you",
]);

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !keywordStopWords.has(word));
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildKeywords(category: QuestionCategory, questionText: string, idealAnswer: string): string[] {
  const words = [...extractWords(questionText), ...extractWords(idealAnswer)];

  return Array.from(new Set([category, ...words])).slice(0, 8);
}

function buildQuestionDataset(repetitions: number): Question[] {
  let idCounter = 1;
  const dataset: Question[] = [];

  for (let i = 0; i < repetitions; i++) {
    for (const category of Object.keys(categoryQuestionBank) as QuestionCategory[]) {
      categoryQuestionBank[category].forEach((seed, index) => {
        dataset.push({
          id: `${category}-${idCounter++}`,
          category,
          difficulty: difficultyLevels[index % difficultyLevels.length],
          text: seed.question,
          idealAnswer: seed.idealAnswer,
          keywords: buildKeywords(category, seed.question, seed.idealAnswer),
        });
      });
    }
  }

  return dataset;
}

export const questions: Question[] = buildQuestionDataset(datasetRepetitions);

export function getQuestionsByCategory(category: QuestionCategory): Question[] {
  return questions.filter((q) => q.category === category);
}

export function getRandomQuestions(category: QuestionCategory, count: number = 10): Question[] {
  const catQuestions = getQuestionsByCategory(category);
  const shuffled = [...catQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export interface InterviewResult {
  questionId: string;
  questionText: string;
  answer: string;
  idealAnswer: string;
  maxMarks: number;
  marksAwarded: number;
  contentScore: number;
  keywordCoverage: number;
  semanticSimilarity: number;
  confidenceLevel: "high" | "medium" | "low";
  confidenceScore: number;
  fluencyScore: number;
  finalScore: number;
  feedback: string[];
}

export function evaluateAnswer(question: Question, answer: string): InterviewResult {
  const maxMarks = 10;
  const normalizedAnswer = normalizeText(answer);
  const normalizedIdealAnswer = normalizeText(question.idealAnswer);

  if (!normalizedAnswer || normalizedAnswer === "(no answer provided)") {
    return {
      questionId: question.id,
      questionText: question.text,
      answer,
      idealAnswer: question.idealAnswer,
      maxMarks,
      marksAwarded: 0,
      contentScore: 0,
      keywordCoverage: 0,
      semanticSimilarity: 0,
      confidenceLevel: "low",
      confidenceScore: 0,
      fluencyScore: 0,
      finalScore: 0,
      feedback: [
        "No answer was provided.",
        "Write at least 2-3 sentences covering key concepts from the reference answer.",
      ],
    };
  }

  const answerWords = extractWords(answer);
  const answerWordSet = new Set(answerWords);
  const idealWords = extractWords(question.idealAnswer);
  const idealWordSet = new Set(idealWords);

  const keywordHits = question.keywords.filter((kw) => normalizedAnswer.includes(kw.toLowerCase()));
  const keywordCoverage = question.keywords.length ? (keywordHits.length / question.keywords.length) * 100 : 0;

  let idealMatches = 0;
  idealWordSet.forEach((word) => {
    if (answerWordSet.has(word)) {
      idealMatches += 1;
    }
  });

  const semanticSimilarity = idealWordSet.size ? Math.round((idealMatches / idealWordSet.size) * 100) : 0;
  const exactMatchBonus = normalizedAnswer === normalizedIdealAnswer ? 100 : 0;
  const correctnessPercentage = Math.round(
    semanticSimilarity * 0.65 + Math.round(keywordCoverage) * 0.25 + exactMatchBonus * 0.1
  );

  const finalScore = Math.max(0, Math.min(100, correctnessPercentage));
  const contentScore = finalScore;
  const confidenceScore = finalScore;
  const fluencyScore = finalScore;
  const confidenceLevel = finalScore >= 75 ? "high" : finalScore >= 50 ? "medium" : "low";
  const marksAwarded = Math.max(0, Math.min(maxMarks, Math.round((finalScore / 100) * maxMarks)));

  const feedback: string[] = [];
  if (finalScore < 40) feedback.push("Answer is not matching the expected concept. Focus on the core definition.");
  if (finalScore >= 40 && finalScore < 70) feedback.push("Partially correct answer. Include more key terms from the correct answer.");
  if (finalScore >= 70) feedback.push("Good answer. You covered most of the expected points.");

  return {
    questionId: question.id,
    questionText: question.text,
    answer,
    idealAnswer: question.idealAnswer,
    maxMarks,
    marksAwarded,
    contentScore,
    keywordCoverage: Math.round(keywordCoverage),
    semanticSimilarity,
    confidenceLevel,
    confidenceScore,
    fluencyScore,
    finalScore,
    feedback,
  };
}

// ==========================================
// RESUME-BASED DYNAMIC INTERVIEW QUESTIONS
// ==========================================

interface ResumeQuestionSeed {
  text: string;
  category: QuestionCategory;
  idealAnswer: string;
  keywords: string[];
}

const resumeKeywordQuestions: Record<string, ResumeQuestionSeed[]> = {
  react: [
    {
      text: "What are React Hooks and how do they differ from class component lifecycle methods?",
      category: "web",
      idealAnswer: "React Hooks like useState and useEffect allow functional components to manage state and side effects. They replace lifecycle methods like componentDidMount and componentDidUpdate, making code cleaner and more reusable.",
      keywords: ["hooks", "state", "effect", "functional", "lifecycle"]
    },
    {
      text: "Explain the difference between state and props in React.",
      category: "web",
      idealAnswer: "State is local mutable data managed within the component itself, while props are immutable configuration options passed down by a parent component.",
      keywords: ["state", "props", "mutable", "immutable", "parent"]
    }
  ],
  javascript: [
    {
      text: "What is a JavaScript closure and why is it useful?",
      category: "web",
      idealAnswer: "A closure is when a function retains access to its outer scope variables even after the outer function has finished executing. It is useful for data encapsulation and creating private variables.",
      keywords: ["closure", "lexical", "scope", "encapsulation", "private"]
    },
    {
      text: "Explain the event loop in JavaScript.",
      category: "web",
      idealAnswer: "The event loop manages asynchronous code execution by executing tasks in the call stack, and pulling callbacks from the callback queue or microtask queue when the stack is empty.",
      keywords: ["event loop", "call stack", "queue", "asynchronous", "microtask"]
    }
  ],
  typescript: [
    {
      text: "What are the key benefits of using TypeScript over vanilla JavaScript?",
      category: "web",
      idealAnswer: "TypeScript provides static type checking, early bug detection at compile time, interfaces, generics, and improved autocompletion, resulting in a more robust and maintainable codebase.",
      keywords: ["static", "types", "compile", "interfaces", "autocomplete"]
    }
  ],
  python: [
    {
      text: "What is the Global Interpreter Lock (GIL) in Python and how does it affect multi-threading?",
      category: "python",
      idealAnswer: "The GIL is a mutex in CPython that ensures only one thread executes Python bytecode at a time. It limits CPU-bound multi-threading performance, though I/O-bound tasks can still benefit from threading.",
      keywords: ["gil", "lock", "thread", "bytecode", "cpu"]
    },
    {
      text: "Explain decorators in Python and how they are used.",
      category: "python",
      idealAnswer: "Decorators wrap functions or classes to modify or extend their behavior dynamically without changing the original source code. They use the @decorator syntax.",
      keywords: ["decorator", "wrap", "modify", "syntax", "extend"]
    }
  ],
  java: [
    {
      text: "Explain the main pillars of Object-Oriented Programming (OOP) with Java examples.",
      category: "java",
      idealAnswer: "OOP pillars are Encapsulation (private fields with getters), Inheritance (extends keyword), Polymorphism (method overriding/overloading), and Abstraction (abstract classes and interfaces).",
      keywords: ["oop", "encapsulation", "inheritance", "polymorphism", "abstraction"]
    },
    {
      text: "What is Spring Boot and what benefits does it bring to Java developers?",
      category: "java",
      idealAnswer: "Spring Boot is an extension of the Spring framework that simplifies Java backend setup with auto-configuration, starter dependencies, and embedded servers, enabling quick microservices development.",
      keywords: ["spring boot", "configuration", "microservices", "backend", "dependency"]
    }
  ],
  database: [
    {
      text: "What is database normalization and explain 1NF, 2NF, and 3NF?",
      category: "dbms",
      idealAnswer: "Normalization organizes database tables to reduce redundancy. 1NF requires atomic values, 2NF removes partial dependencies, and 3NF removes transitive dependencies.",
      keywords: ["normalization", "redundancy", "atomic", "dependency", "transitive"]
    },
    {
      text: "What is the difference between clustered and non-clustered indexes in relational databases?",
      category: "dbms",
      idealAnswer: "A clustered index determines the physical order of data rows in a table (only one allowed), while a non-clustered index is a separate structure with pointers back to the data rows.",
      keywords: ["index", "clustered", "physical", "pointers", "order"]
    }
  ],
  sql: [
    {
      text: "What are standard SQL JOINS and how do they differ?",
      category: "dbms",
      idealAnswer: "SQL JOINS combine tables. INNER JOIN returns rows with matching keys, LEFT JOIN returns all left rows and matching right rows, RIGHT JOIN is the opposite, and FULL JOIN returns all rows.",
      keywords: ["join", "inner", "left", "right", "full"]
    }
  ],
  aws: [
    {
      text: "Explain the difference between compute services like AWS EC2, S3 storage, and serverless AWS Lambda.",
      category: "networking",
      idealAnswer: "EC2 provides virtual servers, S3 is object storage, and Lambda is serverless computing which runs functions in response to events without managing virtual servers.",
      keywords: ["ec2", "s3", "lambda", "serverless", "storage"]
    }
  ],
  docker: [
    {
      text: "What is Docker and how does a container differ from a virtual machine?",
      category: "os",
      idealAnswer: "Docker containers share the host operating system kernel, making them lightweight and fast. Virtual machines run a full guest OS on virtualized hardware, using much more resources.",
      keywords: ["docker", "container", "kernel", "virtual machine", "hypervisor"]
    }
  ],
  ml: [
    {
      text: "What is overfitting in machine learning and how can it be avoided?",
      category: "python",
      idealAnswer: "Overfitting is when a model performs well on training data but poorly on unseen test data. It is prevented using regularization, cross-validation, dropout, and gathering more training data.",
      keywords: ["overfitting", "training", "test", "regularization", "dropout"]
    }
  ],
  git: [
    {
      text: "Explain git merge vs git rebase.",
      category: "dsa",
      idealAnswer: "Git merge combines branches by creating a new merge commit preserving history, while rebase reapplies commits on top of another branch for a clean, linear commit history.",
      keywords: ["git", "merge", "rebase", "commit", "branch"]
    }
  ]
};

const generalResumeQuestions: ResumeQuestionSeed[] = [
  {
    text: "Can you explain the technical architecture and key challenges of the main project listed on your resume?",
    category: "hr",
    idealAnswer: "In my project, I designed the database schema, connected frontend/backend services, and solved performance latency issues by implementing caching. The main challenge was scaling concurrent API requests.",
    keywords: ["architecture", "project", "challenges", "database", "scaling"]
  },
  {
    text: "What was your exact role and responsibilities in your most recent project, and what technologies did you use?",
    category: "hr",
    idealAnswer: "I was a software developer responsible for implementing features, writing unit tests, and coordinating deployment. I worked with the core backend and frontend stacks mentioned on my resume.",
    keywords: ["role", "responsibilities", "project", "deployment", "technologies"]
  },
  {
    text: "Describe a difficult technical bug or issue you encountered in your projects and how you resolved it.",
    category: "hr",
    idealAnswer: "I identified a memory leak / performance issue during load testing. I used debugging tools, traced it to unresolved promises / db connections, and fixed it by adding connection pooling.",
    keywords: ["bug", "leak", "debugging", "resolved", "performance"]
  },
  {
    text: "Based on your resume, how did you choose the tech stack for your projects, and what trade-offs did you consider?",
    category: "hr",
    idealAnswer: "We chose technologies based on team familiarity, development speed, and scalability. We chose a relational database for data consistency over NoSQL's flexible schema trade-offs.",
    keywords: ["stack", "tech", "scalability", "database", "trade-offs"]
  },
  {
    text: "Can you walk me through an achievement or outcome in your resume that you are particularly proud of?",
    category: "hr",
    idealAnswer: "I successfully built a feature that reduced load times by 30% or automated a pipeline that saved hours of manual deployment weekly. It improved user experience and team productivity.",
    keywords: ["achievement", "proud", "deployment", "reduced", "feature"]
  }
];

export function generateQuestionsFromResume(resumeText: string, count: number = 5): Question[] {
  if (!resumeText) {
    // Fallback to general questions
    return generalResumeQuestions.map((q, idx) => ({
      id: `resume-gen-${idx}`,
      category: q.category,
      difficulty: "Medium",
      text: q.text,
      idealAnswer: q.idealAnswer,
      keywords: q.keywords
    }));
  }

  const normalized = resumeText.toLowerCase();
  const matchedQuestions: Question[] = [];
  let idCounter = 1;

  // Scan skill keywords
  Object.entries(resumeKeywordQuestions).forEach(([skill, seeds]) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:\\b|\\s|^)${escaped}(?:\\b|\\s|$|[.,!?;])`, 'i');
    if (regex.test(normalized)) {
      seeds.forEach((q) => {
        matchedQuestions.push({
          id: `resume-${skill}-${idCounter++}`,
          category: q.category,
          difficulty: "Medium",
          text: q.text,
          idealAnswer: q.idealAnswer,
          keywords: q.keywords
        });
      });
    }
  });

  // Always blend with general project/role questions
  generalResumeQuestions.forEach((q) => {
    matchedQuestions.push({
      id: `resume-gen-${idCounter++}`,
      category: q.category,
      difficulty: "Medium",
      text: q.text,
      idealAnswer: q.idealAnswer,
      keywords: q.keywords
    });
  });

  // Shuffle the selected questions
  const shuffled = [...matchedQuestions].sort(() => Math.random() - 0.5);

  // Take the requested count
  return shuffled.slice(0, count);
}

