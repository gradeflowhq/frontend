import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api';
import { SchemaForm } from '../components/common/forms/SchemaForm';
import PageCard from '../components/common/PageCard';
import ErrorAlert from '../components/common/ErrorAlert';
import { useAuthStore } from '../state/authStore';
import othersSchema from '../schemas/others.json';
import type { BodyIssueTokenAuthTokenPost, TokenPairResponse } from '../api/models';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import HiddenAwareFieldTemplate from '../components/common/forms/HiddenAwareFieldTemplate';

const getLoginSchema = () => {
  const schema = (othersSchema as any)['Body_issue_token_auth_token_post'];
  if (!schema) throw new Error('Body_issue_token_auth_token_post schema not found in others.json');
  return schema;
};

const LoginPage: React.FC = () => {
  useDocumentTitle('Login - GradeFlow');
  const setTokens = useAuthStore((s) => s.setTokens);
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

  const { mutateAsync, isPending, isError, error, isSuccess } = useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: async (payload: BodyIssueTokenAuthTokenPost) => {
      const res = await api.issueTokenAuthTokenPost(payload);
      return res.data as TokenPairResponse;
    },
    onSuccess: (tokenPair) => {
      setTokens(tokenPair);
      // ProtectedRoute will redirect to /assessments
    },
  });

  return (
    <PageCard title="Login">
      <SchemaForm<BodyIssueTokenAuthTokenPost>
        schema={schema}
        uiSchema={uiSchema}
        templates={templates}
        formContext={formContext}
        onSubmit={async ({ formData }) => {
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
        {isSuccess && (
          <div className="alert alert-success">
            <span>Login successful!</span>
          </div>
        )}
      </div>

      <div className="text-sm text-center">
        <span className="mr-1">Don’t have an account?</span>
        <Link to="/register" className="link link-primary">
          Register
        </Link>
      </div>
    </PageCard>
  );
};

export default LoginPage;