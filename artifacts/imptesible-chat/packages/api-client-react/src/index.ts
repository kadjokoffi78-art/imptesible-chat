import {
  useMutation,
  useQuery,
} from '@tanstack/react-query';

let baseUrl = '';
let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setBaseUrl(url: string) {
  baseUrl = url.replace(/\/+$/, '');
}

export function setAuthTokenGetter(
  getter: () => Promise<string | null>
) {
  authTokenGetter = getter;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!baseUrl) {
    throw new Error('API URL non configurée.');
  }

  const token = authTokenGetter
    ? await authTokenGetter()
    : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();

  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data?.message
        ? data.message
        : typeof data === 'object' && data?.error
          ? data.error
          : `Erreur réseau (${response.status})`;

    throw new Error(message);
  }

  return data as T;
}

/* =========================
   TYPES
========================= */

export type User = {
  id: string | number;
  username?: string;
  phone: string;
  name?: string;
};

export type Session = {
  token: string;
  user: User;
};

export type LoginData = {
  phone: string;
  password: string;
};

export type RegisterData = {
  username: string;
  phone: string;
  password: string;
};

export type Contact = {
  id?: string | number;
  user: User;
  conversationId?: string | number;
};

export type Conversation = {
  id: string | number;
  user?: User;
  peer: User;
  title?: string;
  lastMessage?: string;
  updatedAt?: string;
  createdAt?: string;
};

export type Message = {
  id: string | number;
  conversationId?: string | number;
  senderId?: string | number;
  content?: string;
  text?: string;
  createdAt?: string;
  sender?: User;
};

export type SearchUserResult = {
  user: User;
  isContact: boolean;
  conversationId?: string | number;
};

/* =========================
   QUERY KEYS
========================= */

export const getGetMeQueryKey = () => ['/api/me'];

export const getGetContactsQueryKey = () => ['/api/contacts'];

export const getGetConversationsQueryKey = () => [
  '/api/conversations',
];

export const getGetMessagesQueryKey = (
  conversationId: string | number
) => [
  '/api/conversations',
  conversationId,
  'messages',
];

export const getSearchUserQueryKey = ({
  phone,
}: {
  phone: string;
}) => [
  '/api/users/search',
  phone,
];

/* =========================
   AUTH
========================= */

export function useLogin() {
  return useMutation({
    mutationFn: async ({
      data,
    }: {
      data: LoginData;
    }) =>
      request<Session>('/api/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async ({
      data,
    }: {
      data: RegisterData;
    }) =>
      request<Session>('/api/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useGetMe(options?: any) {
  return useQuery<User>({
    queryKey: getGetMeQueryKey(),
    queryFn: () => request<User>('/api/me'),
    ...(options?.query ?? {}),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () =>
      request('/api/logout', {
        method: 'POST',
      }),
  });
}

export async function logout() {
  return request('/api/logout', {
    method: 'POST',
  });
}

/* =========================
   CONVERSATIONS
========================= */

export function useGetConversations(options?: any) {
  return useQuery<Conversation[]>({
    queryKey: getGetConversationsQueryKey(),
    queryFn: () =>
      request<Conversation[]>('/api/conversations'),
    ...(options?.query ?? {}),
  });
}

/* =========================
   MESSAGES
========================= */

export function useGetMessages(
  conversationId: string | number,
  options?: any
) {
  return useQuery<Message[]>({
    queryKey: getGetMessagesQueryKey(conversationId),
    queryFn: () =>
      request<Message[]>(
        `/api/conversations/${encodeURIComponent(
          String(conversationId)
        )}/messages`
      ),
    enabled: Boolean(conversationId),
    ...(options?.query ?? {}),
  });
}

export type SendMessageData = {
  conversationId: string | number;
  content: string;
};

export function useSendMessage() {
  return useMutation({
    mutationFn: async ({
      data,
    }: {
      data: SendMessageData;
    }) =>
      request<Message>('/api/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

/* =========================
   CONTACTS
========================= */

export function useGetContacts(options?: any) {
  return useQuery<Contact[]>({
    queryKey: getGetContactsQueryKey(),
    queryFn: () =>
      request<Contact[]>('/api/contacts'),
    ...(options?.query ?? {}),
  });
}

export function useAddContact() {
  return useMutation({
    mutationFn: async ({
      data,
    }: {
      data: {
        phone?: string;
        userId?: string | number;
      };
    }) => {
      const body =
        data.userId !== undefined
          ? { userId: data.userId }
          : { phone: data.phone };

      return request<Contact>('/api/contacts', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
  });
}

export function useRemoveContact() {
  return useMutation({
    mutationFn: async ({
      userId,
    }: {
      userId: string | number;
    }) =>
      request('/api/contacts', {
        method: 'DELETE',
        body: JSON.stringify({ userId }),
      }),
  });
}

/* =========================
   USER SEARCH
========================= */

export function useSearchUser(
  params: {
    phone: string;
  },
  options?: any
) {
  const phone = params?.phone ?? '';

  return useQuery<SearchUserResult>({
    queryKey: getSearchUserQueryKey({ phone }),
    queryFn: () =>
      request<SearchUserResult>(
        `/api/users/search?phone=${encodeURIComponent(phone)}`
      ),
    enabled: Boolean(phone),
    ...(options?.query ?? {}),
  });
}
