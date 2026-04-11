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
      '15+ built-in rule types — text and number equality, regex, keywords, numeric ranges, fuzzy similarity, multiple choice, and more. No code required for any of them.',
  },
  {
    icon: React.createElement(IconGitBranch, { size: 28 }),
    title: 'Assumption and conditional rules',
    description:
      'Assumption sets award the interpretation that earns the highest score. Conditional rules branch scoring based on earlier answers — no custom code needed.',
  },
  {
    icon: React.createElement(IconCode, { size: 28 }),
    title: 'Programmable rules',
    description:
      'Write arbitrary Python grading logic for anything the built-in rules can\'t express. The programming rule runs student code against test cases in an isolated sandbox.',
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
      'Test any rule against real submissions before saving. See exactly which answers pass or fail and iterate in seconds.',
  },
  {
    icon: React.createElement(IconChartBar, { size: 28 }),
    title: 'Transparent, auditable results',
    description:
      'Per-student and per-question breakdowns show exactly which rules fired and why. GradeFlow flags results as stale whenever submissions or rules change, so you always know what\'s current.',
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
      'Publish final grades directly to Canvas. Configure rounding and comment settings per assignment, and publish grades in bulk. No copy-pasting from spreadsheets.',
  },
];

export const trustStats = [
  { value: '15+', label: 'Built-in rule types' },
  { value: 'Client-side', label: 'Encrypted student IDs' },
  { value: 'Role-based', label: 'Collaboration' },
  { value: 'Canvas', label: 'Direct grade publish' },
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
    description: 'Import student answers from Examplify or any CSV. GradeFlow auto-detects question columns — override anything it gets wrong.',
  },
  {
    n: '3',
    label: 'Define grading rules',
    description: 'Configure questions and rules. Preview results live against real submissions before committing.',
  },
  {
    n: '4',
    label: 'Review answers in bulk',
    description: 'Cluster similar answers and bulk-adjust scores. Fine-tune individual submissions as needed.',
  },
  {
    n: '5',
    label: 'Export or publish grades',
    description: 'Download results as CSV, JSON, or YAML for your own records — or push grades directly to Canvas.',
  },
];

export const faqs: { q: string; a: string }[] = [
  {
    q: 'Does it work with Examplify?',
    a: 'Yes. Export your Examplify results as a CSV and upload it directly. GradeFlow lets you configure which row contains headers, where data starts and ends, and which columns to import as answer data — with auto-detection that you can override.',
  },
  {
    q: 'What if the automated grading gets something wrong?',
    a: 'Every result can be manually adjusted — per student or in bulk. GradeFlow tracks which results were auto-graded vs. manually overridden, so your audit trail is always clean.',
  },
  {
    q: 'Is student data stored on your servers?',
    a: 'Student IDs can be encrypted in your browser before they leave your device — the server only ever receives scrambled data. Your encryption key never leaves the browser.',
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
    q: 'Does GradeFlow integrate with anything other than Canvas?',
    a: 'Canvas is the first supported LMS. Export via CSV works with any grade book. Let us know if there\'s another LMS you\'d like to see supported.',
  },
  {
    q: 'Can I self-host GradeFlow?',
    a: 'Absolutely. GradeFlow is open source (MIT) and ships with Docker. Point it at your own database and you own all your data.',
  },
  {
    q: 'Can I use GradeFlow without the web UI?',
    a: 'Yes. GradeFlow engine ships with a CLI and can also be imported directly as a Python library — useful for scripting, CI pipelines, or integrating grading into your own tooling.',
  },
];
