import React from 'react';
import { Link } from 'react-router-dom';

import PublicNavbar from '@components/common/PublicNavbar';
import {
  IconRules,
  IconCode,
  IconLayers,
  IconCanvas,
  IconChart,
  IconBranch,
} from '@components/ui/Icon';
import { useDocumentTitle } from '@hooks/useDocumentTitle';

type FeatureItem = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

const features: FeatureItem[] = [
  {
    icon: <IconRules className="w-6 h-6" />,
    title: 'Rich grading rules',
    description:
      '15+ built-in rule types — text/number equality, regex, keywords, numeric ranges, similarity, length, multiple choice, and more. Handle any question format.',
  },
  {
    icon: <IconBranch className="w-6 h-6" />,
    title: 'Assumption and conditional rules',
    description:
      'Assumption sets pick the interpretation that earns the highest score across multiple questions. Conditional rules branch scoring based on earlier answers.',
  },
  {
    icon: <IconCode className="w-6 h-6" />,
    title: 'Programmable rules',
    description:
      'Write custom Python grading logic for anything the built-in rules cannot express. You can also grade codes by defining test cases using programming rule.',
  },
  {
    icon: <IconLayers className="w-6 h-6" />,
    title: 'Composable rules',
    description:
      'Combine rules with ALL / ANY / PARTIAL aggregation, nest composite rules, and add bonus rules — all without writing a single line of code.',
  },
  {
    icon: <IconChart className="w-6 h-6" />,
    title: 'Transparent, auditable results',
    description:
      'See exactly which rules fired for every submission. Per-student and per-question breakdowns let you verify and manually adjust any grade.',
  },
  {
    icon: <IconCanvas className="w-5 h-5" />,
    title: 'Canvas LMS integration',
    description:
      'Publish final grades directly to Canvas. Choose per-assignment settings, enable rounding, attach comments, and push with a single click.',
  },
];

const LandingPage: React.FC = () => {
  useDocumentTitle('GradeFlow — Automated Assessment Grading');

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 px-4 text-center bg-base-200">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-5xl font-extrabold tracking-tight mb-6">
              Automate grading{' '}
              <span className="text-primary">without losing control</span>
            </h1>
            <p className="text-lg text-base-content/70 mb-10 max-w-5xl mx-auto">
              GradeFlow grades digital submissions using composable rules — exact match, fuzzy
              text, keyword detection, running student code, custom logic, and more.
              For answers that require human judgment, GradeFlow lets you review and adjust results before publishing.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register" className="btn btn-primary btn-lg">
                Create an account
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg">
                Log in
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Built for the nuances of real assessments
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="card bg-base-200 shadow-sm">
                  <div className="card-body gap-3">
                    <div className="text-primary">{feature.icon}</div>
                    <h3 className="card-title text-base">{feature.title}</h3>
                    <p className="text-base-content/70 text-sm">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 px-4 bg-base-200">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
            <ul className="steps steps-vertical lg:steps-horizontal w-full">
              <li className="step step-primary">
                <div className="text-left lg:text-center m-2 lg:mt-0 lg:pt-4">
                  <p className="font-semibold">Create an assessment</p>
                  <p className="text-sm text-base-content/60">
                    Set up the assessment and invite collaborators
                  </p>
                </div>
              </li>
              <li className="step step-primary">
                <div className="text-left lg:text-center m-2 lg:mt-0 lg:pt-4">
                  <p className="font-semibold">Upload submissions</p>
                  <p className="text-sm text-base-content/60">
                    Import student answers via CSV or bulk upload
                  </p>
                </div>
              </li>
              <li className="step step-primary">
                <div className="text-left lg:text-center m-2 lg:mt-0 lg:pt-4">
                  <p className="font-semibold">Define grading rules</p>
                  <p className="text-sm text-base-content/60">
                    Configure your rubric — questions, rules, and scoring
                  </p>
                </div>
              </li>
              <li className="step step-primary">
                <div className="text-left lg:text-center m-2 lg:mt-0 lg:pt-4">
                  <p className="font-semibold">Review &amp; export</p>
                  <p className="text-sm text-base-content/60">
                    Download results or push grades directly to Canvas
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-base-content/70 mb-8">
              Create an account and run your first automated grading in minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register" className="btn btn-primary btn-lg">
                Create an account
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg">
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer footer-center py-6 bg-base-200 text-base-content/60 text-sm">
        <aside>
          <p>© {new Date().getFullYear()} GradeFlow. Built by educators for educators.</p>
        </aside>
      </footer>
    </div>
  );
};

export default LandingPage;

