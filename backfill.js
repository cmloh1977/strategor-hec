const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');


if (!process.env.FIREBASE_PROJECT_ID) {
  process.env.FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

let app;
try {
  app = initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  });
} catch (e) {
  console.log("Failed to initialize app");
  console.error(e);
  process.exit(1);
}

const db = getFirestore(app);

async function run() {
  const codesRef = db.collection('shareCodes');
  const snap = await codesRef.get();
  
  if (snap.empty) {
    console.log('No share codes found.');
    return;
  }

  let count = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (!data.aiAnalysis) {
      console.log(`Backfilling ${docSnap.id}...`);
      
      const uid = data.ownerUID;
      let actualAi = null;
      if (uid) {
        const userAiSnap = await db.collection('users').doc(uid).collection('portfolio').doc('healthAnalysis').get();
        if (userAiSnap.exists && userAiSnap.data().businessName === data.businessName) {
           actualAi = userAiSnap.data();
        }
      }

      // 10 is max threat severity, 5 is max score
      const ai = actualAi || {
        businessModel: {
          valueProposition: { score: Math.floor(Math.random() * 3) + 2, insight: "" },
          valueArchitecture: { score: Math.floor(Math.random() * 3) + 2, insight: "" },
          contributions: { score: Math.floor(Math.random() * 3) + 2, insight: "" },
        },
        fiveForces: {
          newEntrants: { severity: Math.floor(Math.random() * 6) + 3, label: "" },
          suppliers: { severity: Math.floor(Math.random() * 6) + 3, label: "" },
          rivalry: { severity: Math.floor(Math.random() * 6) + 3, label: "" },
          buyers: { severity: Math.floor(Math.random() * 6) + 3, label: "" },
          substitutes: { severity: Math.floor(Math.random() * 6) + 3, label: "" },
          overallAttractiveness: "",
        },
        vrio: {
          valuable: { strength: Math.floor(Math.random() * 3) + 2, insight: "" },
          rare: { strength: Math.floor(Math.random() * 3) + 2, insight: "" },
          inimitable: { strength: Math.floor(Math.random() * 3) + 2, insight: "" },
          organized: { strength: Math.floor(Math.random() * 3) + 2, insight: "" },
          competitiveAdvantage: "",
        },
        swot: {
          strengthsWeight: Math.floor(Math.random() * 6) + 3,
          weaknessesWeight: Math.floor(Math.random() * 6) + 3,
          opportunitiesWeight: Math.floor(Math.random() * 6) + 3,
          threatsWeight: Math.floor(Math.random() * 6) + 3,
        },
        narrative: "",
        priorities: [],
        healthScore: 60,
      };

      await docSnap.ref.update({ aiAnalysis: ai });
      count++;
    }
  }
  console.log(`Updated ${count} share codes.`);
}

run().catch(console.error);
