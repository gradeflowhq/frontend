import { Box, Center, Text, Title } from '@mantine/core';
import React from 'react';

import { howItWorksSteps } from '../landing-data';

const hiwCols = howItWorksSteps.length;

const LandingHowItWorksSection: React.FC = () => (
  <Box
    component="section"
    aria-labelledby="how-it-works-heading"
    py={64}
    px="md"
  >
    <Center mb={12}>
      <Text
        size="xs"
        fw={700}
        tt="uppercase"
        c="blue"
        style={{ letterSpacing: '0.1em' }}
      >
        How it works
      </Text>
    </Center>
    <Center mb={48}>
      <Title id="how-it-works-heading" order={2} ta="center">
        From raw submissions to published grades
      </Title>
    </Center>

    <Box maw={1080} mx="auto">
      <Box style={{ position: 'relative' }}>
        {/* Dashed connector line — only visible at the breakpoint where
            all steps sit in a single row */}
        <Box
          visibleFrom="md"
          style={{
            position: 'absolute',
            top: 24,
            left: `calc(100% / ${hiwCols * 2})`,
            right: `calc(100% / ${hiwCols * 2})`,
            height: 0,
            borderTop: '2px dashed var(--mantine-color-blue-3)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        <Box
          component="ol"
          data-hiw="steps"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gap: '2rem',
          }}
        >
          {howItWorksSteps.map((step) => (
            <Box
              component="li"
              key={step.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Box
                mb="md"
                aria-label={`Step ${step.n}`}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: 'var(--mantine-color-blue-6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 0 0 6px var(--mantine-color-body)',
                }}
              >
                <Text c="white" fw={700} size="lg">{step.n}</Text>
              </Box>
              <Text fw={600} mb={4}>{step.label}</Text>
              <Text size="sm" c="dimmed" maw={160}>{step.description}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>

    {/* Responsive grid: 1 col on mobile, 5 cols on md+ */}
    <style>{`
      [data-hiw="steps"] { grid-template-columns: repeat(1, 1fr); }
      @media (min-width: 768px) {
        [data-hiw="steps"] { grid-template-columns: repeat(${hiwCols}, 1fr); }
      }
    `}</style>
  </Box>
);

export default LandingHowItWorksSection;
