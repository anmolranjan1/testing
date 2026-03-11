
package com.compliance.main.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class EmployeeTypeDTO {
    @NotNull(message = "empTypeId is required")
    private Integer empTypeId;

    @NotBlank(message = "empTypeName is required")
    private String empTypeName;
}