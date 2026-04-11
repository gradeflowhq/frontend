import { Box, Center, Stack, Text, Title } from '@mantine/core';
import React from 'react';

import { faqs } from '../landingData';

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <Box
      style={{
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--mantine-color-body)',
      }}
    >
      <Box
        component="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: 12,
        }}
        aria-expanded={open}
      >
        <Text fw={500} size="sm" style={{ flex: 1 }}>{q}</Text>
        <Text c="dimmed" style={{ flexShrink: 0, fontSize: 18, lineHeight: 1 }}>{open ? '−' : '+'}</Text>
      </Box>
      {open && (
        <Box px={18} pb={14}>
          <Text size="sm" c="dimmed">{a}</Text>
        </Box>
      )}
    </Box>
  );
};

const LandingFaqSection: React.FC = () => (
  <Box
    component="section"
    aria-labelledby="faq-heading"
    py={72}
    px="md"
    style={{ background: 'var(--mantine-color-default-hover)' }}
  >
    <Center mb={48}>
      <Stack align="center" gap="xs">
        <Text
          size="sm"
          fw={600}
          c="blue"
          tt="uppercase"
          style={{ letterSpacing: '0.06em' }}
        >
          FAQ
        </Text>
        <Title id="faq-heading" order={2} ta="center">
          Common questions
        </Title>
      </Stack>
    </Center>

    <Stack gap="sm" maw={680} mx="auto">
      {faqs.map((faq) => (
        <FaqItem key={faq.q} q={faq.q} a={faq.a} />
      ))}
    </Stack>
  </Box>
);

export default LandingFaqSection;
