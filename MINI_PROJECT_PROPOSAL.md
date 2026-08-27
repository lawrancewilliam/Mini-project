# MINI PROJECT PROPOSAL

### Project Title
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;SecurAI: An AI-Assisted Sensitive Data Leakage Detection and Prevention System

### Problem Statement
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;In modern software development, developers frequently integrate third-party APIs, databases, cloud resources, and authentication services into their codebases. During local development and testing, sensitive credentials—such as API keys, database passwords, private encryption keys, JWT secrets, and SSL certificates—are often hardcoded directly into source files. When these codebases are committed and pushed to public or shared version control systems, these credentials leak, exposing enterprise architecture to massive security breaches. Conventional credential-scanning tools rely exclusively on static Regular Expressions (regex) to flag potential leaks, resulting in high false positive rates and developer alert fatigue. There is a critical need for an intelligent, context-aware web platform that identifies potential leaks and dynamically validates them using machine learning heuristics.

### Abstract
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;SecurAI is an advanced, lightweight web-based security tool engineered to detect, classify, and mitigate sensitive data leaks within source code. Developed using the SvelteKit framework, Node.js, and Tailwind CSS, the platform incorporates a robust hybrid scanning engine to address the deficiencies of traditional static analysis. The core scan pipeline leverages a multi-layered verification strategy combining regex pattern matching, variable name heuristics, and Shannon entropy analysis. Furthermore, it incorporates a machine learning classifier based on TF-IDF vectorization and Cosine Similarity to categorize flagged credentials into Leak Confirmed, Suspicious, Test Data, or False Positive verdicts. SecurAI features an interactive dashboard powered by Chart.js for real-time risk visualization, supports batch repository uploads, and provides automated, audit-ready PDF report generation using html2canvas and jsPDF.

### Student Details
1. Naresh S  
   Register No: 2503617862221052
2. Ragavendhiran R  
   Register No: 2503617862221066

<br><br><br>

| **GUIDE SIGNATURE** | **STUDENT SIGNATURES** |
|:-------------------:|:----------------------:|
