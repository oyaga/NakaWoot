package handler

import (
"mensager-go/internal/repository"
"net/http"
"strconv"

"github.com/gin-gonic/gin"
)

func ListConversationActivities(c *gin.Context) {
convIDStr := c.Param("id")
convID, _ := strconv.ParseUint(convIDStr, 10, 32)

val, _ := c.Get("account_id")
accountID := val.(uint)

activities, err := repository.GetActivitiesByConversation(uint(convID), accountID)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}

c.JSON(http.StatusOK, activities)
}