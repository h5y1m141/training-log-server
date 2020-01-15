import { ApolloServer, gql } from 'apollo-server-cloud-functions'
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import serviceAccount = require('../config/serviceAccountKey.json')

// Note: http://ropupu-ropupu.hatenablog.com/entry/2019/02/19/212426
const params = {
  type: serviceAccount.type,
  projectId: serviceAccount.project_id,
  privateKeyId: serviceAccount.private_key_id,
  privateKey: serviceAccount.private_key,
  clientEmail: serviceAccount.client_email,
  clientId: serviceAccount.client_id,
  authUri: serviceAccount.auth_uri,
  tokenUri: serviceAccount.token_uri,
  authProviderX509CertUrl: serviceAccount.auth_provider_x509_cert_url,
  clientC509CertUrl: serviceAccount.client_x509_cert_url,
}

admin.initializeApp({
  credential: admin.credential.cert(params),
  databaseURL: process.env.DATABASE_URL,
})

const data = {
  users: [
    {
      id: 1,
      givenName: '麗奈',
      familyName: '原口',
      email: 'rharaguc@example.jp',
    },
    {
      id: 2,
      givenName: '百世',
      familyName: '和田',
      email: 'mwada@example.jp',
    },
    {
      id: 3,
      givenName: '安彦',
      familyName: '深田',
      email: 'yfukada@example.jp',
    },
  ],
  exerciseMenus: [
    {
      id: 1,
      name: 'プランク',
    },
    {
      id: 2,
      name: 'サイドプランク',
    },
    {
      id: 3,
      name: 'リバースプランク',
    },
    {
      id: 4,
      name: 'チンニング',
    },
  ],
  exercises: [
    {
      id: 1,
      userId: 1,
      exerciseMenuIds: [1, 2],
    },
  ],
}

const typeDefs = gql`
  type Exercise {
    id: ID!
    user: User!
    exerciseMenus: [ExerciseMenu!]!
  }

  type ExerciseMenu {
    id: ID!
    name: String!
  }

  type User {
    id: ID!
    givenName: String
    familyName: String
    email: String!
  }

  type Query {
    exercises: [Exercise!]
    user(id: ID!): User
    exercise(id: ID!): Exercise!
  }
  type Mutation {
    dummy: String
    city(name: String!, country: String!): String
  }
`
const findById = (rows: any[], id: number) =>
  rows.find(row => Number(row.id) === Number(id))

const resolvers = {
  Query: {
    exercises: () => data.exercises,
    user: (_: any, { id }: any) => findById(data.users, id),
    exercise: (_: any, { id }: any) => findById(data.exercises, id),
  },
  Mutation: {
    city: (_: any, { name, country }: any) => {
      const fireStore = admin.firestore()
      const citiesRef = fireStore.collection('cities')
      citiesRef.doc('gIVUqewodi2AEccHj5Nd').set({
        name: name,
        state: 'CA',
        country: country,
        capital: false,
        population: 860000,
      })

      return 'ok'
    },
  },
  Exercise: {
    user: (item: { userId: number }) => findById(data.users, item.userId),
    exerciseMenus: (item: { exerciseMenuIds: any }) =>
      (item.exerciseMenuIds || []).map((id: number) =>
        findById(data.exerciseMenus, id)
      ),
  },
  ExerciseMenu: {},
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req, res }) => ({
    headers: req.headers,
    req,
    res,
  }),
})

exports.graphql = functions.https.onRequest(server.createHandler())
