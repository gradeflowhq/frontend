import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@api';
import { SchemaForm } from '@components/common/forms/SchemaForm';
import PageCard from '@components/common/PageCard';
import ErrorAlert from '@components/common/ErrorAlert';
import { useAuthStore } from '@state/authStore';
import othersSchema from '@schemas/others.json';
import type { BodyIssueTokenAuthTokenPost, TokenPairResponse } from '@api/models';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import HiddenAwareFieldTemplate from '@components/common/forms/HiddenAwareFieldTemplate';
import { useToast } from '@components/common/ToastProvider';
import type { JSONSchema7 } from 'json-schema';

const getLoginSchema = (): JSONSchema7 => {
  const schema = (othersSchema as Record<string, JSONSchema7>)['Body_issue_token_auth_token_post'];
  if (!schema) throw new Error('Body_issue_token_auth_token_post schema not found in others.json');
  return schema;
};

const LoginPage: React.FC = () => {
  useDocumentTitle('Login - GradeFlow');
  const setTokens = useAuthStore((s) => s.setTokens);
  const toast = useToast();
  const schema = useMemo(() => getLoginSchema(), []);

  // Keys we never want to render (global hide via HiddenAwareFieldTemplate + formContext)
  const hideKeys = useMemo(() => new Set(['grant_type', 'scope', 'client_id', 'client_secret']), []);

  const uiSchema = useMemo(
    () => ({
      'ui:title': '',
      'ui:options': { label: true },
      username: { 'ui:widget': 'email', 'ui:options': { inputType: 'email' } },
      password: { 'ui:widget': 'password', 'ui:options': { inputType: 'password' } },
      // Local hiding still retained; global hide will also suppress rendering robustly
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
      // ProtectedRoute will redirect to /assessments
      toast.success('Login successful');
    },
    onError: (err) => {
      toast.error(err, 'Login failed');
    },
  });

  return (
    <PageCard
      title="Login"
      footer={
        <div className="text-sm text-center">
          <span className="mr-1">Don’t have an account?</span>
          <Link to="/register" className="link link-primary">
            Register
          </Link>
        </div>
      }
    >
      <SchemaForm<BodyIssueTokenAuthTokenPost>
        schema={schema}
        uiSchema={uiSchema}
        templates={templates}
        formContext={formContext}
        isSubmitting={isPending}
        onSubmit={async ({ formData }) => {
          if (!formData) return;
          await mutateAsync(formData);
        }}
        formProps={{ noHtml5Validate: true }}
      />

      <div className="">
        {isPending && (
          <div className="alert alert-info">
            <span>Signing you in...</span>
          </div>
        )}
        {isError && <ErrorAlert error={error} />}
      </div>
    </PageCard>
  );
};

export default LoginPage;