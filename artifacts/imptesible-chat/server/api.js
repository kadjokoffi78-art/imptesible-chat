const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PORT = Number(process.env.PORT || process.env.API_PORT || 3001);

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, '[]');
}

const sessions = new Map();

function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(data));
}

function getToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    createdAt: user.createdAt,
  };
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100000) throw new Error('Requête trop volumineuse.');
  }
  return raw ? JSON.parse(raw) : {};
}

async function hashPassword(password, salt) {
  return (await scrypt(password, salt, 64)).toString('hex');
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = url.pathname;

  try {
    if (route === '/api/health' && req.method === 'GET') {
      return send(res, 200, { ok: true, service: 'imptesible-chat-api' });
    }

    if (route === '/api/register' && req.method === 'POST') {
      const body = await readBody(req);
      const phone = String(body.phone || body.identifier || body.username || '').trim();
      const name = String(body.username || body.name || body.fullName || phone).trim();
      const password = String(body.password || '');

      if (!phone || !password) {
        return send(res, 400, { message: 'Numéro et mot de passe obligatoires.' });
      }
      if (password.length < 8) {
        return send(res, 400, { message: 'Le mot de passe doit contenir au moins 8 caractères.' });
      }

      const users = readUsers();
      if (users.some(u => u.phone.toLowerCase() === phone.toLowerCase())) {
        return send(res, 409, { message: 'Ce numéro possède déjà un compte.' });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = await hashPassword(password, salt);
      const user = {
        id: crypto.randomUUID(),
        name: name || phone,
        phone,
        salt,
        passwordHash,
        createdAt: new Date().toISOString(),
      };

      users.push(user);
      saveUsers(users);

      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, user.id);
      return send(res, 201, { token, user: publicUser(user) });
    }

    if (route === '/api/login' && req.method === 'POST') {
      const body = await readBody(req);
      const phone = String(body.phone || body.identifier || body.username || '').trim();
      const password = String(body.password || '');
      const user = readUsers().find(
        u => u.phone.toLowerCase() === phone.toLowerCase()
      );

      if (!user || !(await hashPassword(password, user.salt)).match(
        new RegExp('^' + user.passwordHash + '$')
      )) {
        return send(res, 401, { message: 'Numéro ou mot de passe incorrect.' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, user.id);
      return send(res, 200, { token, user: publicUser(user) });
    }


    if (route === '/api/users/search' && req.method === 'GET') {
      const phone = String(url.searchParams.get('phone') || '').trim();
      const normalize = value => String(value || '').replace(/[\\s()-]/g, '');
      if (phone.length < 8 || phone.length > 20) {
        return send(res, 400, { message: 'Numéro invalide.' });
      }

      const token = getToken(req);
      const currentUserId = sessions.get(token);
      const target = readUsers().find(user =>
        normalize(user.phone) === normalize(phone) &&
        user.id !== currentUserId
      );

      if (!target) {
        return send(res, 200, { user: null, isContact: false });
      }

      return send(res, 200, {
        user: {
          id: target.id,
          username: target.name,
          phone: target.phone,
        },
        isContact: false,
      });
    }

    if (route === '/api/me' && req.method === 'GET') {
      const token = getToken(req);
      const id = sessions.get(token);
      const user = readUsers().find(u => u.id === id);
      if (!user) return send(res, 401, { message: 'Session invalide. Reconnectez-vous.' });
      return send(res, 200, publicUser(user));
    }

    if (route === '/api/logout' && req.method === 'POST') {
      sessions.delete(getToken(req));
      return send(res, 200, { ok: true });
    }


    // IMPREVISIBLE_CHAT_ROUTES_V1
    const chatFs = require('fs');
    const chatPath = require('path');
    const chatCrypto = require('crypto');
    const chatDir = chatPath.join(__dirname, 'data');

    chatFs.mkdirSync(chatDir, { recursive: true });

    const chatFiles = {
      contacts: chatPath.join(chatDir, 'contacts.json'),
      conversations: chatPath.join(chatDir, 'conversations.json'),
      messages: chatPath.join(chatDir, 'messages.json')
    };

    for (const filename of Object.values(chatFiles)) {
      if (!chatFs.existsSync(filename)) {
        chatFs.writeFileSync(filename, '[]\n');
      }
    }

    const chatRead = key => {
      try {
        const value = JSON.parse(chatFs.readFileSync(chatFiles[key], 'utf8'));
        return Array.isArray(value) ? value : [];
      } catch {
        throw new Error('Fichier de données illisible : ' + key);
      }
    };

    const chatWrite = (key, value) => {
      chatFs.writeFileSync(chatFiles[key], JSON.stringify(value, null, 2));
    };

    const chatUser = user => ({
      id: user.id,
      name: user.name || '',
      username: user.name || user.phone,
      phone: user.phone
    });

    const chatAuth = () => {
      const token = getToken(req);
      const id = sessions.get(token);
      const user = readUsers().find(item => item.id === id);
      return user || null;
    };

    const chatConversationFor = (a, b) =>
      chatRead('conversations').find(c =>
        Array.isArray(c.participants) &&
        c.participants.includes(a) &&
        c.participants.includes(b)
      );

    if (
      route === '/api/contacts' &&
      (req.method === 'GET' || req.method === 'POST' || req.method === 'DELETE')
    ) {
      const me = chatAuth();
      if (!me) return send(res, 401, { message: 'Connectez-vous à nouveau.' });

      if (req.method === 'GET') {
        const users = readUsers();
        const contacts = chatRead('contacts')
          .filter(c => c.ownerId === me.id)
          .map(c => {
            const target = users.find(u => u.id === c.userId);
            if (!target) return null;
            return {
              id: target.id,
              user: chatUser(target),
              conversationId: c.conversationId
            };
          })
          .filter(Boolean);

        return send(res, 200, contacts);
      }

      const body = await readBody(req);

      if (req.method === 'POST') {
        const normalize = value =>
          String(value || '').replace(/[\s()-]/g, '');

        const target = readUsers().find(u =>
          u.id !== me.id &&
          (
            (body.userId != null && String(u.id) === String(body.userId)) ||
            (body.phone && normalize(u.phone) === normalize(body.phone))
          )
        );

        if (!target) {
          return send(res, 404, { message: 'Utilisateur introuvable.' });
        }

        let conversations = chatRead('conversations');
        let conversation = conversations.find(c =>
          Array.isArray(c.participants) &&
          c.participants.includes(me.id) &&
          c.participants.includes(target.id)
        );

        if (!conversation) {
          conversation = {
            id: chatCrypto.randomUUID(),
            participants: [me.id, target.id],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastMessage: ''
          };
          conversations.push(conversation);
          chatWrite('conversations', conversations);
        }

        const contacts = chatRead('contacts');
        if (!contacts.some(c =>
          c.ownerId === me.id && c.userId === target.id
        )) {
          contacts.push({
            ownerId: me.id,
            userId: target.id,
            conversationId: conversation.id,
            createdAt: new Date().toISOString()
          });
          chatWrite('contacts', contacts);
        }

        return send(res, 200, {
          id: target.id,
          user: chatUser(target),
          conversationId: conversation.id
        });
      }

      const targetId = String(body.userId || '');
      const contacts = chatRead('contacts').filter(c =>
        !(c.ownerId === me.id && String(c.userId) === targetId)
      );
      chatWrite('contacts', contacts);
      return send(res, 200, { ok: true });
    }

    if (route === '/api/conversations' && req.method === 'GET') {
      const me = chatAuth();
      if (!me) return send(res, 401, { message: 'Connectez-vous à nouveau.' });

      const users = readUsers();
      const messages = chatRead('messages');

      const result = chatRead('conversations')
        .filter(c => Array.isArray(c.participants) && c.participants.includes(me.id))
        .map(c => {
          const peerId = c.participants.find(id => id !== me.id);
          const peerRecord = users.find(u => u.id === peerId);
          if (!peerRecord) return null;

          const last = messages
            .filter(m => String(m.conversationId) === String(c.id))
            .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];

          return {
            id: c.id,
            peer: chatUser(peerRecord),
            user: chatUser(peerRecord),
            title: peerRecord.name || peerRecord.phone,
            lastMessage: last ? last.content : '',
            updatedAt: c.updatedAt || c.createdAt,
            createdAt: c.createdAt
          };
        })
        .filter(Boolean)
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

      return send(res, 200, result);
    }

    if (
      route.startsWith('/api/conversations/') &&
      route.endsWith('/messages') &&
      req.method === 'GET'
    ) {
      const me = chatAuth();
      if (!me) return send(res, 401, { message: 'Connectez-vous à nouveau.' });

      const prefix = '/api/conversations/';
      const conversationId = route.slice(prefix.length, -'/messages'.length);
      const conversation = chatRead('conversations').find(c =>
        String(c.id) === decodeURIComponent(conversationId) &&
        Array.isArray(c.participants) &&
        c.participants.includes(me.id)
      );

      if (!conversation) {
        return send(res, 404, { message: 'Conversation introuvable.' });
      }

      const users = readUsers();
      const result = chatRead('messages')
        .filter(m => String(m.conversationId) === String(conversation.id))
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
        .map(m => {
          const sender = users.find(u => u.id === m.senderId);
          return {
            ...m,
            text: m.content,
            sender: sender ? chatUser(sender) : null
          };
        });

      return send(res, 200, result);
    }

    if (route === '/api/messages' && req.method === 'POST') {
      const me = chatAuth();
      if (!me) return send(res, 401, { message: 'Connectez-vous à nouveau.' });

      const body = await readBody(req);
      const content = String(body.content || body.text || '').trim();
      const conversationId = String(body.conversationId || '');

      if (!conversationId || !content || content.length > 5000) {
        return send(res, 400, { message: 'Conversation ou message invalide.' });
      }

      const conversations = chatRead('conversations');
      const conversation = conversations.find(c =>
        String(c.id) === conversationId &&
        Array.isArray(c.participants) &&
        c.participants.includes(me.id)
      );

      if (!conversation) {
        return send(res, 404, { message: 'Conversation introuvable.' });
      }

      const message = {
        id: chatCrypto.randomUUID(),
        conversationId: conversation.id,
        senderId: me.id,
        content,
        text: content,
        createdAt: new Date().toISOString()
      };

      const messages = chatRead('messages');
      messages.push(message);
      chatWrite('messages', messages);

      conversation.lastMessage = content;
      conversation.updatedAt = message.createdAt;
      chatWrite('conversations', conversations);

      return send(res, 201, {
        ...message,
        sender: chatUser(me)
      });
    }


    return send(res, 404, { message: 'Route API introuvable.' });
  } catch (error) {
    console.error(error);
    return send(res, 400, { message: 'Requête invalide ou erreur du serveur.' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('API Imptébisible Chat active sur le port ' + PORT);
  console.log('Test : http://127.0.0.1:' + PORT + '/api/health');
});
