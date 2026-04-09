import {
  IconAdjustments,
  IconChartBar,
  IconCode,
  IconEye,
  IconGitBranch,
  IconLayoutColumns,
  IconSend,
  IconStack2,
  IconUsers,
} from '@tabler/icons-react';
import React from 'react';

export type FeatureItem = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

export const features: FeatureItem[] = [
  {
    icon: React.createElement(IconAdjustments, { size: 28 }),
    title: 'Rich grading rules',
    description:
      '15+ built-in rule types — text/number equality, regex, keywords, numeric ranges, similarity, length, multiple choice, and more. Handle any question format.',
  },
  {
    icon: React.createElement(IconGitBranch, { size: 28 }),
    title: 'Assumption and conditional rules',
    description:
      'Assumption sets pick the interpretation that earns the highest score across multiple questions. Conditional rules branch scoring based on earlier answers.',
  },
  {
    icon: React.createElement(IconCode, { size: 28 }),
    title: 'Programmable rules',
    description:
      'Write custom Python grading logic for anything the built-in rules cannot express. You can also grade code by defining test cases using the programming rule.',
  },
  {
    icon: React.createElement(IconStack2, { size: 28 }),
    title: 'Composable rules',
    description:
      'Combine rules with ALL / ANY / PARTIAL aggregation, nest composite rules, and add bonus rules — all without writing a single line of code.',
  },
  {
    icon: React.createElement(IconLayoutColumns, { size: 28 }),
    title: 'Answer grouping & bulk review',
    description:
      'Cluster similar student answers by exact match or fuzzy similarity threshold. Adjust points and feedback for an entire answer group at once, then fine-tune individuals as needed.',
  },
  {
    icon: React.createElement(IconEye, { size: 28 }),
    title: 'Live grading preview',
    description:
      'Test any rule against real student submissions before saving it. The inline preview shows exactly which answers pass or fail — so you iterate in seconds, not after re-running the whole job.',
  },
  {
    icon: React.createElement(IconChartBar, { size: 28 }),
    title: 'Transparent, auditable results',
    description:
      'See exactly which rules fired for every submission. Per-student and per-question breakdowns let you verify and adjust any grade. GradeFlow automatically warns you when results are stale after rules or submissions change.',
  },
  {
    icon: React.createElement(IconUsers, { size: 28 }),
    title: 'Team collaboration',
    description:
      'Invite teaching assistants and co-instructors as owners, editors, or viewers. Everyone works on the same assessment with role-based access — no emailing spreadsheets back and forth.',
  },
  {
    icon: React.createElement(IconSend, { size: 28 }),
    title: 'Canvas LMS integration',
    description:
      'Publish final grades directly to Canvas. Choose per-assignment settings, enable rounding, attach comments, and push with a single click.',
  },
];

export const trustStats = [
  { value: '15+', label: 'Rule types' },
  { value: 'Zero-knowledge', label: 'Client-side encryption' },
  { value: 'Team roles', label: 'Owner · Editor · Viewer' },
  { value: 'Canvas LMS', label: 'Native integration' },
];

export const howItWorksSteps = [
  {
    n: '1',
    label: 'Create an assessment',
    description: 'Set up the assessment and invite your team as owners, editors, or viewers.',
  },
  {
    n: '2',
    label: 'Upload submissions',
    description: 'Import student answers from Examplify or any CSV. GradeFlow auto-detects columns and layout.',
  },
  {
    n: '3',
    label: 'Define grading rules',
    description: 'Configure questions and rules. Preview results live against real submissions before committing.',
  },
  {
    n: '4',
    label: 'Review by answer groups',
    description: 'Cluster similar answers and bulk-adjust scores. Fine-tune individual submissions as needed.',
  },
  {
    n: '5',
    label: 'Export or publish',
    description: 'Download results as CSV, JSON, or YAML — or push grades directly to Canvas.',
  },
];

export const faqs: { q: string; a: string }[] = [
  {
    q: 'Does it work with Examplify?',
    a: 'Yes. Export your Examplify results as a CSV and upload it directly. GradeFlow lets you configure which row contains headers, where data starts and ends, and which columns to import as answer data — with auto-detection that you can override.',
  },
  {
    q: 'Is student data stored on your servers?',
    a: 'Student IDs can be encrypted client-side before upload using AES-GCM. The server only ever sees the ciphertext — your passphrase never leaves the browser.',
  },
  {
    q: 'Can multiple instructors work on the same assessment?',
    a: 'Yes. You can invite collaborators by email and assign them owner, editor, or viewer roles. Everyone sees the same rules, results, and adjustments.',
  },
  {
    q: 'How does answer grouping work?',
    a: 'The group view clusters student answers by exact match or fuzzy similarity — you control the threshold. You can then set the score and feedback for an entire cluster at once, which is useful when many students gave essentially the same answer with minor wording differences.',
  },
  {
    q: 'Can I self-host GradeFlow?',
    a: 'Absolutely. GradeFlow is open source (MIT) and ships with Docker. Point it at your own database and you own all your data.',
  },
  {
    q: 'Can I use GradeFlow without the web UI?',
    a: 'Yes. GradeFlow engine ships with a CLI and can also be imported directly as a Python library — useful for scripting, CI pipelines, or integrating grading into your own tooling.',
  },
  {
    q: 'What if the built-in rules are not enough?',
    a: 'Use the programmable rule to write arbitrary grading logic, or the programming rule to run student code against test cases — all sandboxed server-side.',
  },
];
