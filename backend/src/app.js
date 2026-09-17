import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRouter from './modules/auth/auth.router.js';
import usersRouter from './modules/users/users.router.js';
import adminRouter from './modules/admin/admin.router.js';
import documentsRouter from './modules/documents/documents.router.js';
import draftRouter from './modules/draft/draft.router.js';
import editorialRouter from './modules/editorial/editorial.router.js';
import reviewRouter from './modules/review/review.router.js';
import publicationRouter from './modules/publication/publication.router.js';
import liveRouter from './modules/live/live.router.js';
import deletionRouter from './modules/deletion/deletion.router.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

app.get('/health', (req, res) => res.json({ success: true, message: 'DocFlow API is up.' }));

const v1 = express.Router();
v1.use('/auth', authRouter);
v1.use('/users', usersRouter);
v1.use('/admin', adminRouter);
v1.use('/documents', documentsRouter);
v1.use('/draft', draftRouter);
v1.use('/editorial', editorialRouter);
v1.use('/review', reviewRouter);
v1.use('/publication', publicationRouter);
v1.use('/live', liveRouter);
v1.use('/deletion', deletionRouter);

app.use('/api/v1', v1);

app.use(notFound);
app.use(errorHandler);

export default app;
