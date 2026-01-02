import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, deleteDoc, query, collection, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { randomizeAvatarConfig, type AvatarConfig } from "@/lib/avatar-utils"

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" }
  }
  return { valid: true }
}

export async function checkUsernameAvailable(username: string, currentUserId?: string): Promise<boolean> {
  const q = query(collection(db, "users"), where("username", "==", username))
  const querySnapshot = await getDocs(q)

  if (querySnapshot.empty) {
    return true
  }

  if (currentUserId) {
    return querySnapshot.docs[0].id === currentUserId
  }

  return false
}

export async function signUpWithEmail(
  email: string,
  password: string,
  username: string
) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  )
  const user = userCredential.user

  await updateProfile(user, { displayName: username })

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    username,
    avatarConfig: randomizeAvatarConfig(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return user
}

export async function signInWithEmail(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  const userCredential = await signInWithPopup(auth, provider)
  const user = userCredential.user

  const userDoc = await getDoc(doc(db, "users", user.uid))
  if (!userDoc.exists()) {
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      username: user.displayName,
      avatarConfig: randomizeAvatarConfig(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  return user
}

export async function signOut() {
  await firebaseSignOut(auth)
}

export async function signOutEverywhere() {
  await firebaseSignOut(auth)
}

export async function updateUserProfile(
  userId: string,
  username: string,
  avatarConfig?: AvatarConfig
) {
  const user = auth.currentUser
  if (!user) throw new Error("No user logged in")

  await updateProfile(user, { displayName: username })

  const updateData: any = {
    username,
    updatedAt: serverTimestamp(),
  }

  if (avatarConfig) {
    updateData.avatarConfig = avatarConfig
  }

  await updateDoc(doc(db, "users", userId), updateData)
}

export async function changeUserPassword(
  currentPassword: string,
  newPassword: string
) {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error("No user logged in")

  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)

  await updatePassword(user, newPassword)
}

export async function deleteUserAccount(password: string) {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error("No user logged in")

  const credential = EmailAuthProvider.credential(user.email, password)
  await reauthenticateWithCredential(user, credential)

  await deleteDoc(doc(db, "users", user.uid))

  await deleteUser(user)
}
