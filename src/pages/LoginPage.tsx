import { Alert, Card, Title, Anchor, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query';
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { api } from '@api';
import HiddenAwareFieldTemplate from '@components/common/forms/HiddenAwareFieldTemplate';
import { SchemaForm } from '@components/common/forms/SchemaForm';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import othersSchema from '@schemas/others.json';
import { useAuthStore } from '@state/authStore';
import { getErrorMessages } from '@utils/error';

import type { BodyIssueTokenAuthTokenPost, TokenPairResponse } from '@api/models';
import type { JSONSchema7 } from 'json-schema';

const getLoginSchema = (): JSONSchema7 => {
  const schema = (othersSchema as Record<string, JSONSchema7>)['Body_issue_token_auth_token_post'];
  if (!schema) throw new Error('Body_issue_token_auth_token_post schema not found in others.json');
  return schema;
};

const LoginPage: React.FC = () => {
  useDocumentTitle('Login - GradeFlow');
  const setTokens = useAuthStore((s) => s.setTokens);
  const schema = useMemo(() => getLoginSchema(), []);

  const hideKeys = useMemo(() => new Set(['grant_type', 'scope', 'client_id', 'client_secret']), []);

  const uiSchema = useMemo(
    () => ({
      'ui:title': '',
      'ui:options': { label: true },
      username: { 'ui:widget': 'email', 'ui:options': { inputType: 'email' } },
      password: { 'ui:widget': 'password', 'ui:options': { inputType: 'password' } },
      grant_type: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } },
      scope: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } },
      client_id: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } },
      client_secret: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } },
    }),
    []
  );

  const templates = useMemo(() => ({ FieldTemplate: HiddenAwareFieldTemplate }), []);
  const formContext = useMemo(() => ({ hideKeys }), [hideKeys]);

  const { mutateAsync, isPending, isError, error } = useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: async (payload: BodyIssueTokenAuthTokenPost) => {
      const res = await api.issueTokenAuthTokenPost(payload);
      return res.data as TokenPairResponse;
    },
    onSuccess: (tokenPair) => {
      setTokens(tokenPair);
      notifications.show({ color: 'green', message: 'Login successful' });
    },
  });

  return (
    <Card withBorder shadow="sm" w={400} p="xl">
        <Title order={2} mb="lg" ta="center">Login</Title>

        <SchemaForm<BodyIssueTokenAuthTokenPost>
          schema={schema}
          uiSchema={uiSchema}
          templates={templates}
          formContext={formContext}
          isSubmitting={isPending}
          onSubmit={({ formData }) => {
            if (!formData) return;
            void mutateAsync(formData);
          }}
          formProps={{ noHtml5Validate: true }}
        />

        {isPending && (
          <Alert color="blue" mt="sm">Signing you in...</Alert>
        )}
        {isError && (
          <Alert color="red" mt="sm">{getErrorMessages(error).join(' ')}</Alert>
        )}

        <Text size="sm" ta="center" mt="md">
          Don&apos;t have an account?{' '}
          <Anchor component={Link} to="/register">Register</Anchor>
        </Text>
    </Card>
  );
};

export default LoginPage;
