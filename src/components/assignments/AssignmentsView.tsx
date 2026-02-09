import { useAssignments } from '../../hooks/useAssignments'
import GenericCalendar from '../calendar/GenericCalendar'

export default function AssignmentsView() {
  const {
    assignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    toggleComplete,
  } = useAssignments()

  return (
    <GenericCalendar
      title="Assignments"
      items={assignments}
      onCreate={createAssignment}
      onUpdate={updateAssignment}
      onDelete={deleteAssignment}
      onToggleComplete={toggleComplete}
      itemType="assignment"
    />
  )
}
