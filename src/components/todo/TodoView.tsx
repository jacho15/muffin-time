import { useTodos } from '../../hooks/useTodos'
import GenericCalendar from '../calendar/GenericCalendar'

export default function TodoView() {
  const {
    todos,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
  } = useTodos()

  return (
    <GenericCalendar
      title="To-Do Calendar"
      items={todos}
      onCreate={createTodo}
      onUpdate={updateTodo}
      onDelete={deleteTodo}
      onToggleComplete={toggleComplete}
      itemType="todo"
    />
  )
}
