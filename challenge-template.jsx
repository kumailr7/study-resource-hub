import { useState } from "react";

const challenges = [
  {
    id: 1,
    category: "DEVOPS",
    categoryColor: "#4f8ef7",
    duration: "7 DAYS",
    title: "The Docker Sprint",
    tagline: "Containerise everything. Ship with confidence.",
    description:
      "Master containerisation fundamentals in 7 days. Cover Dockerfile, compose, and multi-stage builds.",
    difficulty: "Beginner",
    difficultyColor: "#22c55e",
    prerequisites: ["Basic Linux CLI", "Git fundamentals"],
    whatYouBuild: "A fully containerised multi-service app with Docker Compose",
    topics: [
      { day: "Day 1–2", title: "Docker Basics", desc: "Images, containers, layers, and the Docker CLI" },
      { day: "Day 3–4", title: "Dockerfile Mastery", desc: "Writing efficient Dockerfiles, caching, multi-stage builds" },
      { day: "Day 5–6", title: "Docker Compose", desc: "Multi-container apps, networking, volumes, env vars" },
      { day: "Day 7", title: "Final Challenge", desc: "Containerise a real app and push to Docker Hub" },
    ],
    skills: ["Docker CLI", "Dockerfile", "Docker Compose", "Networking", "Image Optimisation"],
    outcome: "Deploy a production-ready containerised application",
  },
  {
    id: 2,
    category: "ORCHESTRATION",
    categoryColor: "#e040fb",
    duration: "14 DAYS",
    title: "Kubernetes Deep Dive",
    tagline: "Orchestrate at scale. Survive production.",
    description:
      "Deploy a full microservices stack on a local cluster. Deployments, Services, Ingress & RBAC.",
    difficulty: "Intermediate",
    difficultyColor: "#f59e0b",
    prerequisites: ["Docker basics", "Basic networking", "YAML fluency"],
    whatYouBuild: "A microservices app running on a local K8s cluster with Ingress and RBAC",
    topics: [
      { day: "Day 1–3", title: "K8s Architecture", desc: "Nodes, Pods, control plane, kubectl basics" },
      { day: "Day 4–6", title: "Workloads", desc: "Deployments, ReplicaSets, DaemonSets, StatefulSets" },
      { day: "Day 7–9", title: "Networking", desc: "Services, Ingress, DNS, NetworkPolicies" },
      { day: "Day 10–12", title: "Config & Storage", desc: "ConfigMaps, Secrets, PersistentVolumes" },
      { day: "Day 13–14", title: "RBAC & Final Project", desc: "Role-based access + deploy full microservices stack" },
    ],
    skills: ["kubectl", "Deployments", "Ingress", "RBAC", "Helm basics", "Namespaces"],
    outcome: "Run and manage a multi-service Kubernetes cluster locally",
  },
  {
    id: 3,
    category: "AUTOMATION",
    categoryColor: "#a78bfa",
    duration: "5 DAYS",
    title: "CI/CD Pipeline Build",
    tagline: "Automate the path from code to production.",
    description:
      "Build a full GitHub Actions pipeline with Docker build, test, push and deploy stages.",
    difficulty: "Beginner",
    difficultyColor: "#22c55e",
    prerequisites: ["Git & GitHub", "Basic Docker"],
    whatYouBuild: "A working CI/CD pipeline that tests, builds, and deploys on every push",
    topics: [
      { day: "Day 1", title: "GitHub Actions Basics", desc: "Workflows, jobs, steps, runners, triggers" },
      { day: "Day 2", title: "Build & Test Stage", desc: "Lint, unit tests, coverage reports in CI" },
      { day: "Day 3", title: "Docker Build & Push", desc: "Containerise and push to Docker Hub / GHCR" },
      { day: "Day 4", title: "Deploy Stage", desc: "Deploy to a server or cloud on merge to main" },
      { day: "Day 5", title: "Final Pipeline", desc: "End-to-end pipeline for a real project" },
    ],
    skills: ["GitHub Actions", "YAML Workflows", "Docker", "Secrets Management", "Deployment Automation"],
    outcome: "Ship code automatically from commit to live environment",
  },
  {
    id: 4,
    category: "CLOUD",
    categoryColor: "#fb923c",
    duration: "10 DAYS",
    title: "AWS Cloud Practitioner",
    tagline: "Understand the cloud. Pass the exam.",
    description:
      "Cover core AWS services: EC2, S3, IAM, VPC, RDS. Prep for the certification exam.",
    difficulty: "Beginner",
    difficultyColor: "#22c55e",
    prerequisites: ["Basic networking concepts", "No AWS experience needed"],
    whatYouBuild: "A multi-tier app architecture deployed on AWS core services",
    topics: [
      { day: "Day 1–2", title: "AWS Foundations", desc: "Regions, AZs, IAM, billing, shared responsibility" },
      { day: "Day 3–4", title: "Compute & Storage", desc: "EC2, S3, EBS, Lambda overview" },
      { day: "Day 5–6", title: "Networking", desc: "VPC, subnets, security groups, Route 53" },
      { day: "Day 7–8", title: "Databases", desc: "RDS, DynamoDB, ElastiCache basics" },
      { day: "Day 9–10", title: "Exam Prep", desc: "Practice questions, exam tips, mock test" },
    ],
    skills: ["IAM", "EC2", "S3", "VPC", "RDS", "CloudWatch", "AWS CLI"],
    outcome: "AWS Certified Cloud Practitioner exam ready",
  },
  {
    id: 5,
    category: "LINUX",
    categoryColor: "#4ade80",
    duration: "7 DAYS",
    title: "Linux for DevOps",
    tagline: "Command the terminal. Own the system.",
    description:
      "Shell scripting, systemd, file permissions, networking tools and process management.",
    difficulty: "Beginner",
    difficultyColor: "#22c55e",
    prerequisites: ["Basic computer literacy", "Access to a Linux VM or WSL"],
    whatYouBuild: "A set of automation shell scripts for real sysadmin tasks",
    topics: [
      { day: "Day 1–2", title: "Linux Fundamentals", desc: "Filesystem, navigation, users, permissions, package managers" },
      { day: "Day 3–4", title: "Shell Scripting", desc: "Bash scripting, variables, loops, conditionals, cron jobs" },
      { day: "Day 5", title: "Process & Service Management", desc: "systemd, journalctl, ps, kill, top" },
      { day: "Day 6", title: "Networking Tools", desc: "curl, wget, netstat, ss, iptables basics" },
      { day: "Day 7", title: "Final Challenge", desc: "Write a deployment automation script" },
    ],
    skills: ["Bash", "systemd", "File Permissions", "Cron", "Networking CLI", "Process Management"],
    outcome: "Confidently operate and automate any Linux system",
  },
  {
    id: 6,
    category: "IAC",
    categoryColor: "#818cf8",
    duration: "7 DAYS",
    title: "Terraform Fundamentals",
    tagline: "Infrastructure as code. Version it. Automate it.",
    description:
      "Provision cloud infrastructure as code. State management, modules, and remote backends.",
    difficulty: "Intermediate",
    difficultyColor: "#f59e0b",
    prerequisites: ["Basic AWS knowledge", "CLI comfort"],
    whatYouBuild: "A full AWS infrastructure (VPC, EC2, S3) provisioned entirely via Terraform",
    topics: [
      { day: "Day 1–2", title: "Terraform Basics", desc: "Providers, resources, variables, outputs, plan/apply" },
      { day: "Day 3", title: "State Management", desc: "Local vs remote state, state locking, S3 backend" },
      { day: "Day 4–5", title: "Modules", desc: "Writing reusable modules, module registry, composition" },
      { day: "Day 6", title: "Real Infrastructure", desc: "Provision VPC, EC2, security groups, S3 on AWS" },
      { day: "Day 7", title: "Final Project", desc: "Full infra deployment with remote backend + CI" },
    ],
    skills: ["HCL", "Terraform CLI", "Remote State", "Modules", "AWS Provider", "Workspaces"],
    outcome: "Provision and manage cloud infrastructure with zero click-ops",
  },
];

export default function ChallengeTemplate() {
  const [selected, setSelected] = useState(null);

  const open = challenges.find((c) => c.id === selected);

  return (
    <div style={{ fontFamily: "'DM Mono', 'Fira Mono', monospace", background: "#0d0d0f", minHeight: "100vh", color: "#e2e8f0", padding: "40px 24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0d0d0f; } ::-webkit-scrollbar-thumb { background: #2a2a35; border-radius: 3px; }
        .card { background: #111116; border: 1px solid #1e1e28; border-radius: 4px; padding: 24px; cursor: pointer; transition: border-color 0.2s, transform 0.2s; position: relative; overflow: hidden; }
        .card:hover { border-color: #2e2e3e; transform: translateY(-2px); }
        .card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--accent); }
        .tag { font-size: 11px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
        .btn { border: 1px solid #2e2e3e; background: transparent; color: #e2e8f0; padding: 10px 20px; font-family: inherit; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
        .btn:hover { background: #1e1e28; border-color: #3e3e50; }
        .btn-primary { background: var(--accent); border-color: var(--accent); color: #0d0d0f; font-weight: 600; }
        .btn-primary:hover { opacity: 0.85; background: var(--accent); }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 50; display: flex; align-items: flex-start; justify-content: center; padding: 40px 16px; overflow-y: auto; }
        .modal { background: #111116; border: 1px solid #1e1e28; border-radius: 4px; max-width: 720px; width: 100%; position: relative; }
        .modal-header { padding: 32px; border-bottom: 1px solid #1a1a24; position: relative; }
        .modal-header::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--accent); }
        .modal-body { padding: 32px; }
        .section-title { font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #4a4a5e; margin-bottom: 14px; }
        .timeline-item { display: flex; gap: 16px; margin-bottom: 14px; }
        .timeline-day { font-size: 11px; color: #4a4a5e; width: 70px; flex-shrink: 0; padding-top: 2px; }
        .timeline-content { border-left: 1px solid #1e1e28; padding-left: 16px; flex: 1; }
        .skill-pill { display: inline-block; border: 1px solid #1e1e28; padding: 4px 10px; font-size: 11px; margin: 3px; color: #9a9ab0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
        .info-box { background: #0d0d0f; border: 1px solid #1a1a24; padding: 16px; }
        .close-btn { position: absolute; top: 20px; right: 20px; background: transparent; border: 1px solid #2e2e3e; color: #9a9ab0; width: 32px; height: 32px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .close-btn:hover { background: #1e1e28; color: #e2e8f0; }
        .divider { border: none; border-top: 1px solid #1a1a24; margin: 24px 0; }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 1100, margin: "0 auto 40px" }}>
        <p style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#4a4a5e", marginBottom: 8 }}>devops-dojo.ninja</p>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>Challenges</h1>
        <p style={{ color: "#4a4a5e", marginTop: 8, fontSize: 13 }}>Weekly & community learning sprints</p>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1100, margin: "0 auto" }} className="grid">
        {challenges.map((c) => (
          <div key={c.id} className="card" style={{ "--accent": c.categoryColor }} onClick={() => setSelected(c.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span className="tag" style={{ color: c.categoryColor }}>{c.category}</span>
              <span style={{ fontSize: 11, color: "#4a4a5e" }}>{c.duration}</span>
            </div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{c.title}</h2>
            <p style={{ fontSize: 13, color: "#6a6a80", lineHeight: 1.6, marginBottom: 20 }}>{c.description}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: c.difficultyColor, border: `1px solid ${c.difficultyColor}22`, padding: "3px 8px" }}>{c.difficulty}</span>
              <span style={{ fontSize: 11, color: "#4a4a5e", letterSpacing: "0.1em" }}>VIEW DETAILS →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {open && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ "--accent": open.categoryColor }}>
            <div className="modal-header">
              <button className="close-btn" onClick={() => setSelected(null)}>×</button>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span className="tag" style={{ color: open.categoryColor }}>{open.category}</span>
                <span style={{ fontSize: 11, color: "#4a4a5e" }}>{open.duration}</span>
              </div>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>{open.title}</h2>
              <p style={{ fontSize: 13, color: open.categoryColor, fontStyle: "italic" }}>{open.tagline}</p>
            </div>

            <div className="modal-body">
              {/* Info boxes */}
              <div className="info-grid">
                <div className="info-box">
                  <p className="section-title">Difficulty</p>
                  <p style={{ fontSize: 14, color: open.difficultyColor, fontWeight: 500 }}>{open.difficulty}</p>
                </div>
                <div className="info-box">
                  <p className="section-title">Duration</p>
                  <p style={{ fontSize: 14 }}>{open.duration}</p>
                </div>
                <div className="info-box" style={{ gridColumn: "1 / -1" }}>
                  <p className="section-title">What You'll Build</p>
                  <p style={{ fontSize: 13, color: "#9a9ab0", lineHeight: 1.6 }}>{open.whatYouBuild}</p>
                </div>
              </div>

              {/* Prerequisites */}
              <div style={{ marginBottom: 24 }}>
                <p className="section-title">Prerequisites</p>
                {open.prerequisites.map((p, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#6a6a80", padding: "6px 0", borderBottom: "1px solid #1a1a24", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: open.categoryColor }}>—</span> {p}
                  </div>
                ))}
              </div>

              <hr className="divider" />

              {/* Timeline */}
              <div style={{ marginBottom: 24 }}>
                <p className="section-title">Challenge Breakdown</p>
                {open.topics.map((t, i) => (
                  <div key={i} className="timeline-item">
                    <span className="timeline-day">{t.day}</span>
                    <div className="timeline-content">
                      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{t.title}</p>
                      <p style={{ fontSize: 12, color: "#6a6a80", lineHeight: 1.5 }}>{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <hr className="divider" />

              {/* Skills */}
              <div style={{ marginBottom: 28 }}>
                <p className="section-title">Skills You'll Gain</p>
                <div>
                  {open.skills.map((s, i) => (
                    <span key={i} className="skill-pill">{s}</span>
                  ))}
                </div>
              </div>

              {/* Outcome */}
              <div style={{ background: `${open.categoryColor}0d`, border: `1px solid ${open.categoryColor}33`, padding: 16, marginBottom: 28 }}>
                <p style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: open.categoryColor, marginBottom: 6 }}>Outcome</p>
                <p style={{ fontSize: 13, color: "#c2c2d0", lineHeight: 1.6 }}>{open.outcome}</p>
              </div>

              {/* CTA */}
              <button className="btn btn-primary" style={{ width: "100%", padding: "14px", fontSize: 12, "--accent": open.categoryColor }}>
                START CHALLENGE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
