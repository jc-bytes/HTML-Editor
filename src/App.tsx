import { OpenSourceEditor } from './editor'
import { EditorAccountGate } from './editor-platform'

export default function App() {
  return <EditorAccountGate>{(account) => <OpenSourceEditor
        accountEmail={account.email}
        editorProjectId={account.project.id}
        isGuest={account.isGuest}
        onSignOut={account.signOut}
      />}</EditorAccountGate>
}
